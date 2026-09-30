import { createBrowserClient } from '@supabase/ssr';
import { createClient as createJsClient, SupabaseClient } from '@supabase/supabase-js';

export const getSupabaseUrl = (): string => {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
};

export const getSupabaseAnonKey = (): string => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
};

/**
 * Validates whether real, production-ready Supabase credentials are configured.
 * Rejects default placeholders like 'your-project.supabase.co' or 'demo-anon-key'.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;

  const urlLower = url.toLowerCase();
  const keyLower = key.toLowerCase();

  // Check for placeholder patterns
  if (
    urlLower.includes('your-project') ||
    urlLower.includes('demo.supabase') ||
    urlLower.includes('example.com') ||
    urlLower.includes('placeholder.supabase') ||
    !urlLower.startsWith('https://')
  ) {
    return false;
  }

  if (
    keyLower.includes('your-anon-key') ||
    keyLower.includes('your-publishable-key') ||
    keyLower.includes('demo-anon-key') ||
    keyLower.includes('placeholder') ||
    keyLower.length < 20
  ) {
    return false;
  }

  return true;
};

// Return host without exposing secrets
export function getSupabaseHost(): string {
  const url = getSupabaseUrl();
  if (!url) return 'Not configured';
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'Invalid URL';
  }
}

// Safe fallback URL and Key for client initialization without triggering network errors
const safeUrl = isSupabaseConfigured() ? getSupabaseUrl() : 'https://placeholder.supabase.co';
const safeAnonKey = isSupabaseConfigured() ? getSupabaseAnonKey() : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

/**
 * Modern Supabase Client using @supabase/ssr createBrowserClient for browser environment
 * Ensures cookie-backed sessions with SameSite=Lax and seamless Next.js SSR compatibility
 */
export const supabase: SupabaseClient =
  typeof window !== 'undefined'
    ? createBrowserClient(safeUrl, safeAnonKey)
    : createJsClient(safeUrl, safeAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
