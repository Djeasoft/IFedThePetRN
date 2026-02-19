// AuthContext - Supabase Auth State Provider
// Version: 1.0.0 - Session management with reactive state updates
// Version: 1.1.0 - Add error handling for invalid refresh tokens
// Version: 1.2.0 - Validate cached session with getUser() on startup to catch stale refresh tokens

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        // getSession() reads from local storage cache — does NOT validate with server
        const { data: { session: cachedSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('⚠️ Auth session error on startup:', sessionError.message);
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          return;
        }

        if (cachedSession) {
          // Validate the cached session against the server.
          // This catches stale/invalid refresh tokens BEFORE leaving the loading state,
          // preventing a flash of logged-in UI followed by a sign-out.
          const { error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.warn('⚠️ Cached session invalid, signing out:', userError.message);
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            return;
          }
          console.log('✅ Session validated:', cachedSession.user?.email ?? 'no user');
        }

        setSession(cachedSession);
      } catch (err) {
        console.error('❌ Unexpected auth error on startup:', err);
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes (login, logout, token refresh, email verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth state changed - event:', event, 'session:', session?.user?.email ?? 'no user');
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session?.user,
    isEmailVerified: session?.user?.email_confirmed_at != null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
