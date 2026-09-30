// ============================================================================
// LifeLens Command — Auth Diagnostic & Service Worker Inspector
// Provides safe, zero-leak telemetry for diagnosing mobile browser auth issues
// ============================================================================

import { isSupabaseConfigured, getSupabaseHost, getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  type: 'STARTED' | 'SENT' | 'RECEIVED' | 'ERROR' | 'INFO';
  title: string;
  details?: Record<string, any>;
}

// In-memory trace buffer (Max 50 entries)
let traceBuffer: DiagnosticLog[] = [];
let listeners: Array<(traces: DiagnosticLog[]) => void> = [];

export function recordAuthTrace(
  type: 'STARTED' | 'SENT' | 'RECEIVED' | 'ERROR' | 'INFO',
  title: string,
  details?: Record<string, any>
) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

  // Sanitize details: strictly remove any passwords, keys, or tokens
  const sanitizedDetails: Record<string, any> = {};
  if (details) {
    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('pass') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key')
      ) {
        sanitizedDetails[key] = '[REDACTED]';
      } else {
        sanitizedDetails[key] = value;
      }
    }
  }

  const entry: DiagnosticLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    type,
    title,
    details: Object.keys(sanitizedDetails).length > 0 ? sanitizedDetails : undefined,
  };

  traceBuffer = [entry, ...traceBuffer].slice(0, 50);
  listeners.forEach((l) => l([...traceBuffer]));
}

export function getAuthTraces(): DiagnosticLog[] {
  return [...traceBuffer];
}

export function clearAuthTraces() {
  traceBuffer = [];
  listeners.forEach((l) => l([]));
}

export function subscribeToAuthTraces(
  listener: (traces: DiagnosticLog[]) => void
): () => void {
  listeners.push(listener);
  listener([...traceBuffer]);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export interface ServiceWorkerDiagnostic {
  supported: boolean;
  controller: string | null;
  registrationCount: number;
  registrations: Array<{
    scope: string;
    scriptURL: string;
    state: string;
  }>;
}

/**
 * Inspect browser Service Worker state safely
 */
export async function getServiceWorkerDiagnostic(): Promise<ServiceWorkerDiagnostic> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      supported: false,
      controller: null,
      registrationCount: 0,
      registrations: [],
    };
  }

  const controller = navigator.serviceWorker.controller
    ? navigator.serviceWorker.controller.scriptURL
    : null;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const registrations = regs.map((r) => {
      const sw = r.active || r.waiting || r.installing;
      return {
        scope: r.scope,
        scriptURL: sw ? sw.scriptURL : 'unknown',
        state: sw ? sw.state : 'unregistered',
      };
    });

    return {
      supported: true,
      controller,
      registrationCount: regs.length,
      registrations,
    };
  } catch (err: any) {
    return {
      supported: true,
      controller,
      registrationCount: 0,
      registrations: [],
    };
  }
}

/**
 * Temporarily unregister all Service Workers and clear caches
 * Allows user to verify if Service Worker was interfering with auth requests
 */
export async function unregisterAllServiceWorkers(): Promise<{
  success: boolean;
  unregisteredCount: number;
  clearedCachesCount: number;
  message: string;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      success: false,
      unregisteredCount: 0,
      clearedCachesCount: 0,
      message: 'Service Worker API is not supported on this browser.',
    };
  }

  let unregisteredCount = 0;
  let clearedCachesCount = 0;

  try {
    // 1. Unregister all active Service Worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const ok = await reg.unregister();
      if (ok) unregisteredCount++;
    }

    // 2. Clear any browser CacheStorage entries
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        const deleted = await caches.delete(key);
        if (deleted) clearedCachesCount++;
      }
    }

    recordAuthTrace(
      'INFO',
      `Service Worker Unregistered: Removed ${unregisteredCount} registration(s), purged ${clearedCachesCount} cache store(s).`
    );

    return {
      success: true,
      unregisteredCount,
      clearedCachesCount,
      message: `Unregistered ${unregisteredCount} Service Worker(s) and purged ${clearedCachesCount} cache storage(s). You can now retry login.`,
    };
  } catch (err: any) {
    recordAuthTrace('ERROR', `Failed to unregister Service Worker: ${err.message}`);
    return {
      success: false,
      unregisteredCount,
      clearedCachesCount,
      message: err.message || 'Failed to unregister Service Workers.',
    };
  }
}

/**
 * Ping Supabase directly to test DNS, TLS, and CORS reachability from this mobile device
 */
export async function testSupabaseConnectivity(): Promise<{
  success: boolean;
  status?: number;
  message: string;
  host: string;
  durationMs: number;
}> {
  const host = getSupabaseHost();

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      host,
      durationMs: 0,
      message:
        'Supabase is unconfigured (using default demo fallback). To connect to a real project, configure NEXT_PUBLIC_SUPABASE_URL and key in Vercel.',
    };
  }

  const rawUrl = getSupabaseUrl();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    recordAuthTrace('SENT', `Pinging Supabase Auth health endpoint: ${host}`, {
      host,
      targetUrl: `${rawUrl}/auth/v1/health`,
    });

    const res = await fetch(`${rawUrl}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: getSupabaseAnonKey(),
      },
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    recordAuthTrace(
      'RECEIVED',
      `Supabase ping response: HTTP ${res.status} (${durationMs}ms)`,
      {
        host,
        status: res.status,
        durationMs,
      }
    );

    return {
      success: res.ok || res.status === 200 || res.status === 401 || res.status === 404,
      status: res.status,
      host,
      durationMs,
      message: `Supabase server reachable (HTTP ${res.status} in ${durationMs}ms).`,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const isAbort = err.name === 'AbortError';

    const errorMsg = isAbort
      ? `Connection timed out after 6000ms. Mobile network or DNS cannot reach ${host}.`
      : err.message || 'Failed to fetch';

    recordAuthTrace('ERROR', `Supabase connectivity check failed: ${errorMsg}`, {
      host,
      errorName: err.name,
      errorMessage: err.message,
      durationMs,
    });

    return {
      success: false,
      host,
      durationMs,
      message: errorMsg,
    };
  }
}
