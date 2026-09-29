'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

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

export const DEMO_USER: AuthUser = {
  id: 'demo-user-id',
  email: 'demo@lifelens.io',
  full_name: 'LifeLens Demo',
  avatar_url: '',
  created_at: '2026-09-28T00:00:00.000Z',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Clean up any legacy insecure client passwords from prior versions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lifelens_registered_users_v1');
      localStorage.removeItem('lifelens_auth_session_v1');
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Check if demo mode was explicitly active
        const demoActive = localStorage.getItem(DEMO_FLAG_KEY);
        if (demoActive === 'true') {
          setIsDemoMode(true);
          setUser(DEMO_USER);
          setIsLoading(false);
          return;
        }

        // Real Supabase Auth session if configured
        if (isSupabaseConfigured()) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Supabase getSession error:', error.message);
          }

          if (session?.user) {
            // Attempt to fetch profile from profiles table
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Commander',
              avatar_url: profile?.avatar_url || '',
              created_at: session.user.created_at || new Date().toISOString(),
            };
            setUser(authUser);
            setIsDemoMode(false);
            setIsLoading(false);
            return;
          }
        }

        // Not authenticated
        setUser(null);
        setIsDemoMode(false);
      } catch (err) {
        console.error('Session restore error:', err);
        setUser(null);
        setIsDemoMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    // Listen to Supabase Auth state changes
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && !isDemoMode) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Commander',
            avatar_url: profile?.avatar_url || '',
            created_at: session.user.created_at || new Date().toISOString(),
          };
          setUser(authUser);
        } else if (event === 'SIGNED_OUT' && !isDemoMode) {
          setUser(null);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isDemoMode]);

  // Login (Supabase Auth Only)
  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Supabase authentication is not configured in this environment. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or use "Try Demo" to evaluate LifeLens Command in Demo Mode.',
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0],
          avatar_url: profile?.avatar_url || '',
          created_at: data.user.created_at,
        };

        setUser(authUser);
        setIsDemoMode(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DEMO_FLAG_KEY);
        }
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Sign in failed. No user record returned.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  }, []);

  // Signup (Supabase Auth with Email Confirmation Check)
  const signup = useCallback(async (fullName: string, email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Supabase authentication is not configured in this environment. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or use "Try Demo" to evaluate LifeLens Command in Demo Mode.',
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // If email confirmation is required and session is null
        if (!data.session) {
          setIsLoading(false);
          return {
            success: true,
            requiresConfirmation: true,
            message: 'Account created. Check your email to confirm your account, then log in.',
          };
        }

        // Session exists: establish profile
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            created_at: new Date().toISOString(),
          });
        } catch (profileErr) {
          console.warn('Profile upsert note:', profileErr);
        }

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName,
          avatar_url: '',
          created_at: data.user.created_at,
        };

        setUser(authUser);
        setIsDemoMode(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DEMO_FLAG_KEY);
        }
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Signup failed. Please try again.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Signup failed' };
    }
  }, []);

  // Enter Demo Mode
  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setUser(DEMO_USER);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_FLAG_KEY, 'true');
    }
  }, []);

  // Exit Demo Mode
  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_FLAG_KEY);
    }
    // Check if real session exists in Supabase
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || 'Commander',
            avatar_url: '',
            created_at: session.user.created_at,
          });
          router.push('/dashboard');
        } else {
          setUser(null);
          router.push('/login');
        }
      });
    } else {
      setUser(null);
      router.push('/login');
    }
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
