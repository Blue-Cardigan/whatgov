'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useCache } from '@/hooks/useCache';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/supabase';
import type { Subscription } from '@/lib/supabase/subscription';
import { isSubscriptionActive } from '@/lib/supabase/subscription';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (userData: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getAuthHeader: () => Promise<string>;
  isPremium: boolean;
  isEngagedCitizen: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const { getCache, setCache } = useCache();
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    subscription: null,
    loading: true,
    error: null,
  });

  const updateState = (updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Fetch profile with Redis caching
  const fetchProfile = async (userId: string) => {
    const cacheKey = `profile:${userId}`;
    const cached = await getCache<UserProfile>(cacheKey);
    
    if (cached) {
      updateState({ profile: cached });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const profile = {
        name: data.name || '',
        email: state.user?.email || '',
        postcode: data.postcode || '',
        constituency: data.constituency || '',
        mp: data.mp || '',
        mp_id: data.mp_id || null,
        gender: data.gender || '',
        age: data.age || '',
        selected_topics: data.selected_topics || [],
      };

      await setCache(cacheKey, profile, 5 * 60);
      updateState({ profile });
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  // Add subscription fetching
  const fetchSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      updateState({ subscription: data || null });
    } catch (error) {
      console.error('Subscription fetch error:', error);
      updateState({ subscription: null });
    }
  };

  // Auth methods
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  };

  const signOut = async () => {
    try {
      // First clear any user-specific cache
      if (state.user?.id) {
        await fetch('/api/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            key: `profile:${state.user.id}`,
            action: 'delete'
          }),
        });
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      updateState({ 
        user: null, 
        profile: null, 
        subscription: null,
        error: null 
      });

      // Navigate to home page
      router.push('/');
      router.refresh(); // Force a refresh to ensure all authenticated state is cleared
    } catch (error) {
      console.error('Sign out error:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to sign out' 
      });
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error && error.message !== 'Auth session missing!') {
          throw error;
        }

        updateState({ user, loading: false });

        if (user) {
          await Promise.all([
            fetchProfile(user.id),
            fetchSubscription(user.id)
          ]);
        }
      } catch (error) {
        updateState({ 
          user: null, 
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication failed'
        });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (event === 'SIGNED_OUT') {
          updateState({
            user: null,
            profile: null,
            subscription: null,
            loading: false,
            error: null
          });
        } else if (session?.user) {
          updateState({ user: session.user, loading: false });
          await Promise.all([
            fetchProfile(session.user.id),
            fetchSubscription(session.user.id)
          ]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Memoize context value
  const value = useMemo(() => ({
    ...state,
    signIn,
    signUp: async () => ({}), // Implement as needed
    signOut,
    updateProfile: async () => {}, // Implement as needed
    resetPassword: async () => ({ success: false }), // Implement as needed
    updatePassword: async () => ({ success: false }), // Implement as needed
    getAuthHeader: async () => '', // Implement as needed
    isPremium: isSubscriptionActive(state.subscription) && 
      state.subscription?.plan_type === 'PROFESSIONAL',
    isEngagedCitizen: isSubscriptionActive(state.subscription) && 
      ['ENGAGED_CITIZEN', 'PROFESSIONAL'].includes(state.subscription?.plan_type || ''),
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Single hook for auth
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 