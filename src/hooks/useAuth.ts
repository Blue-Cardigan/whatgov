import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Subscription, setSubscriptionCache, isSubscriptionActive } from '@/lib/subscription';
import type { UserProfile } from '@/types/supabase';
import { useCache } from '@/hooks/useCache';

interface SignUpData extends Omit<UserProfile, 'email' | 'email_verified'> {
  first_name?: string;
  last_name?: string;
  mp_id?: number;
  newsletter?: boolean;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  loading: {
    auth: boolean;
    profile: boolean;
    subscription: boolean;
  };
  error: {
    auth: string | null;
    profile: string | null;
    subscription: string | null;
  };
}

export function useAuth() {
  const supabase = useSupabase()
  const { getCache, setCache } = useCache();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    subscription: null,
    loading: {
      auth: true,
      profile: false,
      subscription: false,
    },
    error: {
      auth: null,
      profile: null,
      subscription: null,
    },
  });
  const router = useRouter();

  const updateState = (updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const fetchProfile = async (userId: string) => {
    const cacheKey = `profile:${userId}`;
    const cached = await getCache<UserProfile>(cacheKey);
    
    if (cached) {
      updateState({ profile: cached });
      return;
    }

    updateState({ loading: { ...state.loading, profile: true } });
    
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
      updateState({ profile, error: { ...state.error, profile: null } });
    } catch (error) {
      console.error('Profile fetch error:', error);
      updateState({ 
        error: { 
          ...state.error, 
          profile: error instanceof Error ? error.message : 'Failed to fetch profile'
        }
      });
    } finally {
      updateState({ loading: { ...state.loading, profile: false } });
    }
  };

  const fetchSubscription = async (userId: string) => {
    const cacheKey = `subscription:${userId}`;
    const cached = await getCache<Subscription>(cacheKey);
    
    if (cached) {
      updateState({ subscription: cached });
      return;
    }

    updateState({ loading: { ...state.loading, subscription: true } });

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, stripe_customer_id, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const subscription = data as Subscription | null;
      await setCache(cacheKey, subscription, 5 * 60);
      setSubscriptionCache(userId, subscription);
      updateState({ 
        subscription,
        error: { ...state.error, subscription: null }
      });
    } catch (error) {
      console.error('Subscription fetch error:', error);
      updateState({ 
        error: { 
          ...state.error, 
          subscription: error instanceof Error ? error.message : 'Failed to fetch subscription'
        }
      });
    } finally {
      updateState({ loading: { ...state.loading, subscription: false } });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error && error.message !== 'Auth session missing!') {
          throw error;
        }

        updateState({ 
          user,
          loading: { ...state.loading, auth: false },
          error: { ...state.error, auth: null }
        });

        if (user) {
          fetchProfile(user.id);
          fetchSubscription(user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        updateState({ 
          user: null,
          loading: { ...state.loading, auth: false },
          error: { 
            ...state.error, 
            auth: error instanceof Error ? error.message : 'Authentication failed'
          }
        });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          await fetch('/api/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              key: `profile:${state.user?.id}`,
              action: 'delete'
            }),
          });
          await fetch('/api/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              key: `subscription:${state.user?.id}`,
              action: 'delete'
            }),
          });
          updateState({
            user: null,
            profile: null,
            subscription: null,
            loading: { auth: false, profile: false, subscription: false },
            error: { auth: null, profile: null, subscription: null }
          });
        } else if (session?.user) {
          updateState({ user: session.user });
          fetchProfile(session.user.id);
          fetchSubscription(session.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    updateState({ error: { ...state.error, auth: null } });
    updateState({ loading: { ...state.loading, auth: true } });

    try {
      const response = await signInWithEmail(email, password);
      
      if (response.error) {
        updateState({ error: { ...state.error, auth: response.error } });
        updateState({ user: null });
        return null;
      }

      if (!response.user || !response.session) {
        updateState({ error: { ...state.error, auth: 'Invalid response from authentication server' } });
        updateState({ user: null });
        return null;
      }

      updateState({ user: response.user });
      return response;
    } catch {
      updateState({ error: { ...state.error, auth: 'An unexpected error occurred' } });
      updateState({ user: null });
      return null;
    } finally {
      updateState({ loading: { ...state.loading, auth: false } });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      if (state.user?.id) {
        await fetch('/api/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            key: `profile:${state.user.id}`,
            action: 'delete'
          }),
        });
        await fetch('/api/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            key: `subscription:${state.user.id}`,
            action: 'delete'
          }),
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    updateState({ error: { ...state.error, auth: null } });
    updateState({ loading: { ...state.loading, auth: true } });

    try {
      const profile: UserProfile = {
        ...userData,
        email,
      };

      const response = await signUpWithEmail(email, password, profile);
      
      if (response.status === 'redirect_to_login') {
        router.push('/login?email=' + encodeURIComponent(email));
        return null;
      }

      if (response.status === 'verify_email') {
        router.push('/accounts/verify');
        localStorage.setItem('verification_email', email);
        return response;
      }
      
      if (response.error || response.status === 'error') {
        updateState({ error: { ...state.error, auth: response.error || 'Signup failed' } });
        updateState({ user: null });
        return null;
      }

      updateState({ user: response.user });
      return response;
    } catch (error) {
      console.error('Signup error details:', error);
      updateState({ error: { ...state.error, auth: error instanceof Error ? `Signup failed: ${error.message}` : 'An unexpected error occurred during sign up' } });
      updateState({ user: null });
      return null;
    } finally {
      updateState({ loading: { ...state.loading, auth: false } });
    }
  };

  const updateProfile = async (userData: Partial<SignUpData>) => {
    updateState({ loading: { ...state.loading, profile: true } });
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const { error: profileError } = await supabase.from('user_profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
    } catch (error) {
      updateState({ error: { ...state.error, profile: error instanceof Error ? error.message : 'Profile update failed' } });
    } finally {
      updateState({ loading: { ...state.loading, profile: false } });
    }
  };

  const getAuthHeader = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('No active session');
    return session.access_token;
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/verify`,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reset email'
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password'
      };
    }
  };

  return {
    user: state.user,
    profile: state.profile,
    loading: Object.values(state.loading).some(Boolean),
    loadingState: state.loading,
    error: state.error,
    subscription: state.subscription,
    isPremium: isSubscriptionActive(state.subscription) && state.subscription?.plan_type === 'PROFESSIONAL',
    isEngagedCitizen: isSubscriptionActive(state.subscription) && 
      (state.subscription?.plan_type === 'ENGAGED_CITIZEN' || state.subscription?.plan_type === 'PROFESSIONAL'),
    signIn,
    signUp,
    updateProfile,
    signOut: handleSignOut,
    getAuthHeader,
    resetPassword,
    updatePassword,
  };
}