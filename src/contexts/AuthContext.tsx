'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/supabase';
import type { Subscription } from '@/lib/supabase/subscription';
import { isSubscriptionActive } from '@/lib/supabase/subscription';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase/auth';
import { 
  getSubscriptionFromCache, 
  setSubscriptionCache 
} from '@/lib/supabase/subscription';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
}

interface UserSignUpData {
  name?: string;
  postcode?: string;
  constituency?: string;
  mp?: string;
  gender?: string;
  age?: string;
  selected_topics?: string[];
  newsletter?: boolean;
}

interface SignUpResponse {
  error?: string;
  status?: 'verify_email' | 'success' | 'error';
  user?: {
    id: string;
    email: string;
  };
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: UserSignUpData) => Promise<SignUpResponse>;
  signOut: () => Promise<void>;
  updateProfile: (userData: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getAuthHeader: () => Promise<string>;
  isProfessional: boolean;
  isEngagedCitizen: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    subscription: null,
    loading: true,
    error: null,
  });

  // Wrap updateState in useCallback
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Wrap fetchSubscription in useCallback
  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      const cachedSubscription = await getSubscriptionFromCache(userId);
      if (cachedSubscription) {
        updateState({ subscription: cachedSubscription });
        return;
      }

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      setSubscriptionCache(userId, data);
      updateState({ subscription: data });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      updateState({ subscription: null });
    }
  }, [supabase, updateState]);

  // Wrap fetchProfile in useCallback
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      updateState({ profile: data });
    } catch (error) {
      console.error('Error fetching profile:', error);
      updateState({ profile: null });
    }
  }, [supabase, updateState]);

  // Update useMemo dependencies to include updateState
  const value = useMemo(() => {

    const hasActiveSubscription = state.subscription?.status === 'active' || 
                                 state.subscription?.status === 'trialing';

    const signIn = async (email: string, password: string) => {
      try {
        const { error, status, user } = await signInWithEmail(email, password);
        
        if (status === 'verify_email') {
          return { error: 'Please verify your email before signing in' };
        }
        
        if (error) throw error;

        if (user) {
          // Update user state immediately
          updateState({ 
            user,
            error: null,
            loading: true // Keep loading while fetching additional data
          });

          // Fetch both profile and subscription data
          await Promise.all([
            fetchProfile(user.id),
            fetchSubscription(user.id)
          ]);

          updateState({ loading: false });
        }

        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Sign in failed' };
      }
    };

    const signOut = async () => {
      try {
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

        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        updateState({ 
          user: null, 
          profile: null, 
          subscription: null,
          error: null 
        });

        router.push('/');
        router.refresh();
      } catch (error) {
        console.error('Sign out error:', error);
        updateState({ 
          error: error instanceof Error ? error.message : 'Failed to sign out' 
        });
      }
    };

    const updateProfile = async (userData: Partial<UserProfile>) => {
      if (!state.user?.id) throw new Error('No authenticated user');

      try {
        // Update the profile in Supabase
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            name: userData.name,
            postcode: userData.postcode,
            constituency: userData.constituency,
            mp: userData.mp,
            gender: userData.gender,
            age: userData.age,
            selected_topics: userData.selected_topics,
            newsletter: userData.newsletter,
            updated_at: new Date().toISOString()
          })
          .eq('id', state.user.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        updateState({ 
          profile: { ...state.profile!, ...data } as UserProfile,
          error: null 
        });

        // Clear profile cache
        await fetch('/api/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            key: `profile:${state.user.id}`,
            action: 'delete'
          }),
        });

      } catch (error) {
        console.error('Profile update error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
      }
    };

    const signUp = async (email: string, password: string, userData: UserSignUpData): Promise<SignUpResponse> => {
      try {
        const response = await signUpWithEmail(email, password, {
          email,
          name: userData.name || '',
          gender: userData.gender || '',
          age: userData.age || '',
          postcode: userData.postcode || '',
          constituency: userData.constituency || '',
          mp: userData.mp || '',
          selected_topics: userData.selected_topics || [],
          newsletter: userData.newsletter || false
        });

        if (response.error) {
          return { error: response.error, status: 'error' };
        }

        if (response.status === 'verify_email') {
          return { 
            status: 'verify_email',
            user: {
              id: response.user?.id || '',
              email: email
            }
          };
        }

        return { 
          status: 'success',
          user: {
            id: response.user?.id || '',
            email: email
          }
        };
      } catch (error) {
        console.error('Sign up error:', error);
        return { 
          error: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 'error'
        };
      }
    };

    const getAuthHeader = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    };

    return {
      ...state,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword: async () => ({ success: false }),
      updatePassword: async () => ({ success: false }),
      getAuthHeader,
      isProfessional: hasActiveSubscription && 
        state.subscription?.plan === 'PROFESSIONAL',
      isEngagedCitizen: hasActiveSubscription && 
        ['ENGAGED_CITIZEN', 'PROFESSIONAL'].includes(state.subscription?.plan || ''),
      refreshSubscription: async () => {
        if (state.user?.id) {
          await fetchSubscription(state.user.id);
        }
      }
    };
  }, [
    state,
    router, 
    fetchProfile, 
    fetchSubscription, 
    supabase, 
    updateState
  ]);

  // Update useEffect dependencies to include updateState
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Only fetch full data on initial session
        if (event === 'INITIAL_SESSION') {
          updateState({ 
            user: session.user,
            loading: true 
          });

          await Promise.all([
            fetchProfile(session.user.id),
            fetchSubscription(session.user.id)
          ]);

          updateState({ loading: false });
        } else if (event === 'SIGNED_IN') {
          // On subsequent sign-ins, just update the user
          updateState({ user: session.user });
        }
      } else {
        updateState({ 
          user: null,
          profile: null,
          subscription: null,
          loading: false,
          error: null 
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchProfile, fetchSubscription, updateState]);

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