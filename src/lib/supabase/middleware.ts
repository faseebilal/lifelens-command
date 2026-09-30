import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from './client';

/**
 * Middleware session updater for Supabase Auth in Next.js App Router
 * Refreshes auth tokens on every request and updates cookies
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const rawUrl = getSupabaseUrl();
  const rawAnonKey = getSupabaseAnonKey();

  const supabase = createServerClient(rawUrl, rawAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Refreshes the auth token so the session doesn't expire
  try {
    await supabase.auth.getUser();
  } catch {
    // Fail gracefully if Supabase network is unreachable
  }

  return supabaseResponse;
}
