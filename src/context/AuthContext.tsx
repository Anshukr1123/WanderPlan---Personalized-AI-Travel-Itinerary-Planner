/**
 * Authentication Context for Supabase Auth and Demo Guest Mode.
 */
import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  isDemoMode: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  continueAsDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // In demo mode by default if credentials not yet configured
      setIsDemoMode(true);
      const savedDemo = localStorage.getItem('wanderplan_demo_user');
      if (savedDemo) {
        try {
          setUser(JSON.parse(savedDemo));
        } catch {}
      } else {
        const demoUser: UserProfile = {
          id: 'demo-user-1',
          email: 'traveler@wanderplan.app',
          full_name: 'Explorer Traveler',
          is_demo: true,
        };
        setUser(demoUser);
        localStorage.setItem('wanderplan_demo_user', JSON.stringify(demoUser));
      }
      setIsLoading(false);
      return;
    }

    // Live Supabase Auth session listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          is_demo: false,
        });
        setSessionToken(session.access_token);
        setIsDemoMode(false);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          is_demo: false,
        });
        setSessionToken(session.access_token);
        setIsDemoMode(false);
      } else {
        setUser(null);
        setSessionToken(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      const demo: UserProfile = {
        id: `demo-${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        is_demo: true,
      };
      setUser(demo);
      setIsDemoMode(true);
      localStorage.setItem('wanderplan_demo_user', JSON.stringify(demo));
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const signUpWithEmail = async (email: string, pass: string, fullName: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      const demo: UserProfile = {
        id: `demo-${Date.now()}`,
        email,
        full_name: fullName || email.split('@')[0],
        is_demo: true,
      };
      setUser(demo);
      setIsDemoMode(true);
      localStorage.setItem('wanderplan_demo_user', JSON.stringify(demo));
      return {};
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('wanderplan_demo_user');
    setUser(null);
    setSessionToken(null);
  };

  const continueAsDemoUser = (): void => {
    const demo: UserProfile = {
      id: 'demo-user-1',
      email: 'traveler@wanderplan.app',
      full_name: 'Explorer Traveler',
      is_demo: true,
    };
    setUser(demo);
    setIsDemoMode(true);
    localStorage.setItem('wanderplan_demo_user', JSON.stringify(demo));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isLoading,
        isDemoMode,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        continueAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
