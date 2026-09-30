import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code && isSupabaseConfigured()) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    const response = NextResponse.redirect(new URL(next, request.url));

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      await supabase.auth.exchangeCodeForSession(code);
      return response;
    } catch (err) {
      console.error('Auth code exchange error:', err);
      return NextResponse.redirect(new URL('/login?error=auth_exchange_failed', request.url));
    }
  }

  // Redirect to dashboard or login
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
