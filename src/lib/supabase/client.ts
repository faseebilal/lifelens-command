import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    !urlLower.startsWith('https://')
  ) {
    return false;
  }

  if (
    keyLower.includes('your-anon-key') ||
    keyLower.includes('demo-anon-key') ||
    keyLower.length < 30
  ) {
    return false;
  }

  return true;
};

// Safe fallback URL and Key for client initialization without triggering network errors
const safeUrl = isSupabaseConfigured() ? rawUrl.trim() : 'https://placeholder.supabase.co';
const safeAnonKey = isSupabaseConfigured() ? rawAnonKey.trim() : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(safeUrl, safeAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
