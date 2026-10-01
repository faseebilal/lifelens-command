import { createBrowserClient } from '@supabase/ssr';
import { createClient as createJsClient, SupabaseClient } from '@supabase/supabase-js';

export const getSupabaseUrl = (): string => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (!url) {
    throw new Error('Supabase Configuration Error: NEXT_PUBLIC_SUPABASE_URL is missing. Please configure NEXT_PUBLIC_SUPABASE_URL.');
  }
  return url;
};

export const getSupabasePublishableKey = (): string => {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!key) {
    throw new Error('Supabase Configuration Error: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Please configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  return key;
};

// Backwards-compatibility alias for server/middleware helpers
export const getSupabaseAnonKey = getSupabasePublishableKey;

/**
 * Validates whether real, production-ready Supabase credentials are configured.
 * Rejects default placeholders like 'your-project.supabase.co' or 'placeholder'.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
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
    keyLower.includes('your-publishable-key') ||
    keyLower.includes('placeholder') ||
    keyLower.length < 20
  ) {
    return false;
  }

  return true;
};

// Return host without exposing secrets
export function getSupabaseHost(): string {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (!url) return 'Not configured';
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'Invalid URL';
  }
}

/**
 * Initialize the browser Supabase client using ONLY:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * Fails clearly if either required environment variable is missing.
 */
function initBrowserClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!url) {
    throw new Error('Supabase Configuration Error: NEXT_PUBLIC_SUPABASE_URL is missing. The browser Supabase client cannot be initialized.');
  }
  if (!key) {
    throw new Error('Supabase Configuration Error: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. The browser Supabase client cannot be initialized.');
  }

  return createBrowserClient(url, key);
}

function initServerJsClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!url || !key) {
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        throw new Error(
          `Supabase Configuration Error: Cannot access "${String(prop)}" because ${!url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'} is missing.`
        );
      },
    });
  }

  return createJsClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase: SupabaseClient =
  typeof window !== 'undefined'
    ? initBrowserClient()
    : initServerJsClient();
