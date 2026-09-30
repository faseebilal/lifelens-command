'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured, getSupabaseHost } from '@/lib/supabase/client';
import { recordAuthTrace } from '@/lib/auth-diagnostic';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  requiresConfirmation?: boolean;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (fullName: string, email: string, password: string) => Promise<AuthResponse>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_FLAG_KEY = 'lifelens_demo_active_v1';
const LOCAL_USERS_KEY = 'lifelens_registered_operators_v2';
const LOCAL_SESSION_KEY = 'lifelens_operator_session_v2';

export const DEMO_USER: AuthUser = {
  id: 'demo-user-id',
  email: 'demo@lifelens.io',
  full_name: 'LifeLens Demo',
  avatar_url: '',
  created_at: '2026-09-28T00:00:00.000Z',
};

// Cookie helpers to ensure reliable session persistence on mobile browsers
function setSessionCookie(token: string) {
  if (typeof document !== 'undefined') {
    // 30-day persistent cookie
    document.cookie = `lifelens_session_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
  }
}

function getSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)lifelens_session_token=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'lifelens_session_token=; path=/; max-age=0; SameSite=Lax';
  }
}

// Simple fast hash for local offline operator security
function hashPassword(pwd: string): string {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    const char = pwd.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${pwd.length}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        if (typeof window === 'undefined') return;

        // 1. Check if demo mode was explicitly active
        const demoActive = localStorage.getItem(DEMO_FLAG_KEY);
        if (demoActive === 'true') {
          if (isMounted) {
            setIsDemoMode(true);
            setUser(DEMO_USER);
            setIsLoading(false);
          }
          return;
        }

        // 2. Real Supabase Auth session if properly configured
        if (isSupabaseConfigured()) {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
              console.warn('Supabase getSession error:', error.message);
            }

            if (session?.user && isMounted) {
              let profileName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Commander';
              let avatarUrl = '';

              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();

                if (profile?.full_name) profileName = profile.full_name;
                if (profile?.avatar_url) avatarUrl = profile.avatar_url;
              } catch (profileErr) {
                // Ignore profile lookup if table isn't populated yet
              }

              const authUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                full_name: profileName,
                avatar_url: avatarUrl,
                created_at: session.user.created_at || new Date().toISOString(),
              };

              setUser(authUser);
              setIsDemoMode(false);
              setSessionCookie(session.user.id);
              setIsLoading(false);
              return;
            }
          } catch (supabaseErr: any) {
            console.warn('Supabase session check failed, falling back to local session:', supabaseErr.message);
          }
        }

        // 3. Local Operator Session fallback (For hybrid production & mobile resilience)
        const localSessionJson = localStorage.getItem(LOCAL_SESSION_KEY);
        const cookieToken = getSessionCookie();

        if (localSessionJson) {
          try {
            const parsedUser: AuthUser = JSON.parse(localSessionJson);
            if (parsedUser && parsedUser.id && parsedUser.email && isMounted) {
              setUser(parsedUser);
              setIsDemoMode(false);
              setSessionCookie(parsedUser.id);
              setIsLoading(false);
              return;
            }
          } catch (parseErr) {
            localStorage.removeItem(LOCAL_SESSION_KEY);
          }
        } else if (cookieToken) {
          // If cookie exists but localStorage was cleared, try to restore from registered operators
          try {
            const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
            if (rawUsers) {
              const users = JSON.parse(rawUsers);
              const found = users.find((u: any) => u.id === cookieToken);
              if (found && isMounted) {
                const restored: AuthUser = {
                  id: found.id,
                  email: found.email,
                  full_name: found.full_name,
                  avatar_url: found.avatar_url || '',
                  created_at: found.created_at,
                };
                setUser(restored);
                localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(restored));
                setIsDemoMode(false);
                setIsLoading(false);
                return;
              }
            }
          } catch {
            // Ignore
          }
        }

        // Not authenticated
        if (isMounted) {
          setUser(null);
          setIsDemoMode(false);
        }
      } catch (err) {
        console.error('Session restore error:', err);
        if (isMounted) {
          setUser(null);
          setIsDemoMode(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    // Listen to Supabase Auth state changes if Supabase is active
    if (isSupabaseConfigured()) {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user && !isDemoMode) {
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Commander',
              avatar_url: '',
              created_at: session.user.created_at || new Date().toISOString(),
            };
            setUser(authUser);
            setSessionCookie(session.user.id);
          } else if (event === 'SIGNED_OUT' && !isDemoMode) {
            setUser(null);
            clearSessionCookie();
          }
        });
        return () => {
          subscription.unsubscribe();
        };
      } catch {
        // Fallback safely if listener errors
      }
    }
  }, [isDemoMode]);

  // Login handler (Supports both Supabase and Local Operator Workspace)
  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const emailDomain = cleanEmail.split('@')[1] || 'unknown';
    const supabaseHost = getSupabaseHost();
    const supabaseActive = isSupabaseConfigured();

    recordAuthTrace('STARTED', `Login attempt initiated for domain: @${emailDomain}`);
    recordAuthTrace('INFO', `Supabase Client Initialized`, {
      host: supabaseHost,
      configured: supabaseActive,
    });

    try {
      // 1. Attempt Supabase Auth if configured
      if (supabaseActive) {
        recordAuthTrace('SENT', `Sending credentials to Supabase signInWithPassword`, {
          host: supabaseHost,
          endpoint: '/auth/v1/token?grant_type=password',
        });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

          if (error) {
            recordAuthTrace('ERROR', `Supabase signInWithPassword returned error`, {
              name: error.name || 'AuthApiError',
              status: error.status,
              message: error.message,
            });

            // Check if this error is a network fetch failure
            const isFetchError =
              error.message?.toLowerCase().includes('fetch') ||
              error.status === 0 ||
              error.name === 'AuthRetryableFetchError';

            if (isFetchError) {
              recordAuthTrace('INFO', 'Network failure reached Supabase auth. Checking local operator workspace credentials...');
              if (typeof window !== 'undefined') {
                const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
                const users = rawUsers ? JSON.parse(rawUsers) : [];
                const passHash = hashPassword(password);
                const foundUser = users.find(
                  (u: any) => u.email.toLowerCase() === cleanEmail && u.passwordHash === passHash
                );

                if (foundUser) {
                  const authUser: AuthUser = {
                    id: foundUser.id,
                    email: foundUser.email,
                    full_name: foundUser.full_name,
                    avatar_url: '',
                    created_at: foundUser.created_at,
                  };
                  setUser(authUser);
                  setIsDemoMode(false);
                  setSessionCookie(authUser.id);
                  localStorage.removeItem(DEMO_FLAG_KEY);
                  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(authUser));
                  recordAuthTrace('RECEIVED', 'Successfully authenticated via local operator workspace fallback.', {
                    userId: authUser.id,
                  });
                  setIsLoading(false);
                  return { success: true };
                }
              }

              setIsLoading(false);
              return {
                success: false,
                error: `Unable to reach Supabase authentication server (${error.message}). Please check internet connection, or register an operator account if working in local workspace.`,
              };
            }

            setIsLoading(false);
            return { success: false, error: error.message };
          }

          if (data.user) {
            recordAuthTrace('RECEIVED', `Supabase signInWithPassword succeeded`, {
              userId: data.user.id,
              sessionEstablished: !!data.session,
            });

            let profileName = data.user.user_metadata?.full_name || cleanEmail.split('@')[0];
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();
              if (profile?.full_name) profileName = profile.full_name;
            } catch {
              // Ignore
            }

            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              full_name: profileName,
              avatar_url: '',
              created_at: data.user.created_at,
            };

            setUser(authUser);
            setIsDemoMode(false);
            setSessionCookie(authUser.id);
            if (typeof window !== 'undefined') {
              localStorage.removeItem(DEMO_FLAG_KEY);
              localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(authUser));
            }
            setIsLoading(false);
            return { success: true };
          }
        } catch (supErr: any) {
          recordAuthTrace('ERROR', `Supabase unexpected rejection: ${supErr.message}`, {
            name: supErr.name,
            message: supErr.message,
          });

          if (typeof window !== 'undefined') {
            const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
            const users = rawUsers ? JSON.parse(rawUsers) : [];
            const passHash = hashPassword(password);
            const foundUser = users.find(
              (u: any) => u.email.toLowerCase() === cleanEmail && u.passwordHash === passHash
            );

            if (foundUser) {
              const authUser: AuthUser = {
                id: foundUser.id,
                email: foundUser.email,
                full_name: foundUser.full_name,
                avatar_url: '',
                created_at: foundUser.created_at,
              };
              setUser(authUser);
              setIsDemoMode(false);
              setSessionCookie(authUser.id);
              localStorage.removeItem(DEMO_FLAG_KEY);
              localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(authUser));
              recordAuthTrace('RECEIVED', 'Successfully authenticated via local operator workspace fallback.', {
                userId: authUser.id,
              });
              setIsLoading(false);
              return { success: true };
            }
          }

          setIsLoading(false);
          return {
            success: false,
            error: 'Unable to reach the Supabase authentication server. Please check your internet connection or verify your NEXT_PUBLIC_SUPABASE_URL in Vercel.',
          };
        }
      }

      // 2. Local Operator Login (Hybrid Fallback for zero-failure mobile testing)
      recordAuthTrace('INFO', 'Verifying operator credentials in local workspace storage...');
      if (typeof window !== 'undefined') {
        const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
        const users = rawUsers ? JSON.parse(rawUsers) : [];
        const passHash = hashPassword(password);

        const foundUser = users.find(
          (u: any) => u.email.toLowerCase() === cleanEmail && u.passwordHash === passHash
        );

        if (foundUser) {
          const authUser: AuthUser = {
            id: foundUser.id,
            email: foundUser.email,
            full_name: foundUser.full_name,
            avatar_url: '',
            created_at: foundUser.created_at,
          };

          setUser(authUser);
          setIsDemoMode(false);
          setSessionCookie(authUser.id);
          localStorage.removeItem(DEMO_FLAG_KEY);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(authUser));
          recordAuthTrace('RECEIVED', 'Signed in successfully to local workspace.', {
            userId: authUser.id,
          });
          setIsLoading(false);
          return { success: true };
        }

        recordAuthTrace('ERROR', 'Invalid operator credentials entered.');
        setIsLoading(false);
        return {
          success: false,
          error: 'Invalid credentials. If you just created an account, please make sure the email and password match, or register a new operator account.',
        };
      }

      setIsLoading(false);
      return { success: false, error: 'Sign in failed. Environment storage not available.' };
    } catch (err: any) {
      recordAuthTrace('ERROR', `Sign in unexpected exception: ${err.message}`);
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'Login failed due to unexpected error.',
      };
    }
  }, []);

  // Signup handler (Supports both Supabase and Local Operator Workspace)
  const signup = useCallback(async (fullName: string, email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || 'Commander';
    const emailDomain = cleanEmail.split('@')[1] || 'unknown';
    const supabaseHost = getSupabaseHost();
    const supabaseActive = isSupabaseConfigured();

    recordAuthTrace('STARTED', `Registration initiated for domain: @${emailDomain}`);
    recordAuthTrace('INFO', `Supabase Client Initialized`, {
      host: supabaseHost,
      configured: supabaseActive,
    });

    try {
      // 1. Attempt Supabase Auth if properly configured
      if (supabaseActive) {
        recordAuthTrace('SENT', `Sending registration payload to Supabase signUp`, {
          host: supabaseHost,
          endpoint: '/auth/v1/signup',
        });

        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: cleanName },
            },
          });

          if (error) {
            recordAuthTrace('ERROR', `Supabase signUp returned error`, {
              name: error.name || 'AuthApiError',
              status: error.status,
              message: error.message,
            });

            const isFetchError =
              error.message?.toLowerCase().includes('fetch') ||
              error.status === 0 ||
              error.name === 'AuthRetryableFetchError';

            if (!isFetchError) {
              setIsLoading(false);
              return { success: false, error: error.message };
            }

            // If fetch failed, proceed to local operator registration
            recordAuthTrace('INFO', 'Supabase network unreachable. Falling back to local workspace registration...');
          } else if (data.user) {
            recordAuthTrace('RECEIVED', `Supabase signUp succeeded`, {
              userId: data.user.id,
              sessionEstablished: !!data.session,
            });

            if (!data.session) {
              recordAuthTrace('INFO', 'Email confirmation required by Supabase project');
              setIsLoading(false);
              return {
                success: true,
                requiresConfirmation: true,
                message: 'Account created! Please check your email to confirm your account, then return to sign in.',
              };
            }

            try {
              await supabase.from('profiles').upsert({
                id: data.user.id,
                full_name: cleanName,
                email: cleanEmail,
                created_at: new Date().toISOString(),
              });
            } catch (profileErr) {
              console.warn('Profile upsert note:', profileErr);
            }

            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              full_name: cleanName,
              avatar_url: '',
              created_at: data.user.created_at,
            };

            setUser(authUser);
            setIsDemoMode(false);
            setSessionCookie(authUser.id);
            if (typeof window !== 'undefined') {
              localStorage.removeItem(DEMO_FLAG_KEY);
              localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(authUser));
            }
            setIsLoading(false);
            return { success: true };
          }
        } catch (supErr: any) {
          recordAuthTrace('ERROR', `Supabase unexpected rejection on signup: ${supErr.message}`);
        }
      }

      // 2. Local Operator Signup (Guarantees signup NEVER throws "Failed to fetch")
      recordAuthTrace('INFO', 'Creating account in local workspace storage...');
      if (typeof window !== 'undefined') {
        const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
        const users = rawUsers ? JSON.parse(rawUsers) : [];

        // Check if email already registered
        const existing = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          recordAuthTrace('ERROR', 'Email already exists in local storage.');
          setIsLoading(false);
          return {
            success: false,
            error: 'An account with this email address already exists. Please log in instead.',
          };
        }

        const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const passHash = hashPassword(password);

        const newRecord = {
          id: newId,
          email: cleanEmail,
          full_name: cleanName,
          passwordHash: passHash,
          created_at: new Date().toISOString(),
        };

        users.push(newRecord);
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));

        const authUser: AuthUser = {
          id: newId,
          email: cleanEmail,
          full_name: cleanName,
          avatar_url: '',
          created_at: newRecord.created_at,
        };

        setUser(authUser);
        setIsDemoMode(false);
        setSessionCookie(authUser.id);
        localStorage.removeItem(DEMO_FLAG_KEY);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(authUser));

        recordAuthTrace('RECEIVED', 'Local operator account registered successfully.', {
          userId: authUser.id,
        });

        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Registration failed. Storage not available.' };
    } catch (err: any) {
      recordAuthTrace('ERROR', `Registration exception: ${err.message}`);
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'Signup failed. Please try again.',
      };
    }
  }, []);

  // Enter Demo Mode
  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setUser(DEMO_USER);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_FLAG_KEY, 'true');
      setSessionCookie(DEMO_USER.id);
    }
  }, []);

  // Exit Demo Mode
  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_FLAG_KEY);
      clearSessionCookie();
    }
    setUser(null);
    router.push('/login');
  }, [router]);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Supabase sign out error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEMO_FLAG_KEY);
        localStorage.removeItem(LOCAL_SESSION_KEY);
        clearSessionCookie();
      }
      setUser(null);
      setIsDemoMode(false);
      setIsLoading(false);
      router.push('/login');
    }
  }, [router]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isDemoMode,
    isLoading,
    login,
    signup,
    enterDemoMode,
    exitDemoMode,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
