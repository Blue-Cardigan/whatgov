import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import { signInWithEmail, signUpWithEmail, UserProfile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SignUpData extends Omit<UserProfile, 'email' | 'email_verified'> {
  // Any additional fields specific to SignUpData can go here
}

type Subscription = {
  plan_type: string;
  status: string;
  stripe_customer_id: string | null;
} | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial user state
    const initUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error && error.message !== 'Auth session missing!') {
          console.error('Auth initialization error:', error);
        }
        setUser(user);
      } catch (error) {
        if (error instanceof Error && error.message !== 'Auth session missing!') {
          console.error('Auth initialization error:', error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initUser();

    // Set up real-time subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubscription(null);
        } else {
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch subscription data whenever user changes
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        return;
      }

      try {
        const { data, error } = await createClient()
          .from('subscriptions')
          .select('plan_type, status, stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Subscription fetch error:', error);
          return;
        }

        setSubscription(data as Subscription);
      } catch (error) {
        console.error('Subscription fetch error:', error);
      }
    };

    fetchSubscription();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    setLoading(true);

    try {
      const response = await signInWithEmail(email, password);
      console.log('response', response)
      
      if (response.error) {
        setAuthError(response.error);
        setUser(null);
        return null;
      }

      if (!response.user || !response.session) {
        setAuthError('Invalid response from authentication server');
        setUser(null);
        return null;
      }

      setUser(response.user);
      return response;
    } catch {
      setAuthError('An unexpected error occurred');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    setAuthError(null);
    setLoading(true);

    try {
      const profile: UserProfile = {
        ...userData,
        email,
      };

      const response = await signUpWithEmail(email, password, profile);
      
      if (response.status === 'verify_email') {
        // Include email in redirect
        router.push(`/auth/verify`);
        localStorage.setItem('verification_email', email);
        return response;
      }
      
      if (response.error || response.status === 'error') {
        setAuthError(response.error || 'Signup failed');
        setUser(null);
        return null;
      }

      setUser(response.user);
      return response;
    } catch (error) {
      console.error('Signup error details:', error);
      setAuthError(
        error instanceof Error 
          ? `Signup failed: ${error.message}` 
          : 'An unexpected error occurred during sign up'
      );
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<SignUpData>) => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await createClient().auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const { error: profileError } = await createClient()
        .from('user_profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Profile update failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    authError,
    subscription,
    isPremium: subscription?.status === 'active',
    signIn,
    signUp,
    updateProfile,
    signOut: handleSignOut,
  };
}