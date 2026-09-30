import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from './client';

/**
 * Modern Supabase Server Client for Server Components, Server Actions, and Route Handlers
 * Reads and writes cookies in compliance with Next.js App Router
 */
export async function createClient() {
  const cookieStore = cookies();
  const rawUrl = isSupabaseConfigured()
    ? getSupabaseUrl()
    : 'https://placeholder.supabase.co';
  const rawAnonKey = isSupabaseConfigured()
    ? getSupabaseAnonKey()
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

  return createServerClient(rawUrl, rawAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
