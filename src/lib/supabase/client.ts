import { createBrowserClient } from '@supabase/ssr';
import { createClient as createJsClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Validates whether real, production-ready Supabase credentials are configured.
 * Rejects default placeholders like 'your-project.supabase.co' or 'demo-anon-key'.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!rawUrl || !rawAnonKey) return false;

  const urlLower = rawUrl.toLowerCase().trim();
  const keyLower = rawAnonKey.toLowerCase().trim();

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
    keyLower.includes('demo-anon-key') ||
    keyLower.includes('placeholder') ||
    keyLower.length < 30
  ) {
    return false;
  }

  return true;
};

// Return host without exposing secrets
export function getSupabaseHost(): string {
  if (!rawUrl) return 'Not configured';
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname;
  } catch {
    return 'Invalid URL';
  }
}

// Safe fallback URL and Key for client initialization without triggering network errors
const safeUrl = isSupabaseConfigured() ? rawUrl.trim() : 'https://placeholder.supabase.co';
const safeAnonKey = isSupabaseConfigured() ? rawAnonKey.trim() : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

/**
 * Modern Supabase Client using @supabase/ssr createBrowserClient for browser environment
 * Ensures cookie-backed sessions with SameSite=Lax and seamless Next.js SSR compatibility
 */
export const supabase: SupabaseClient =
  typeof window !== 'undefined'
    ? createBrowserClient(safeUrl, safeAnonKey, {
        cookieOptions: {
          name: 'sb-auth-token',
          lifetime: 60 * 60 * 24 * 30, // 30 days
          domain: '',
          path: '/',
          sameSite: 'lax',
        },
      })
    : createJsClient(safeUrl, safeAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
