import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';

interface SignUpData {
  name: string;
  gender: string;
  postcode: string;
  constituency: string;
  mp: string;
  topics: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user state
    const initUser = async () => {
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
          console.error('User retrieval error:', error);
          await supabaseClient.auth.signOut();
          setUser(null);
          return;
        }

        setUser(user);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initUser();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async () => {
      // Verify user state when auth state changes
      const { data: { user } } = await supabaseClient.auth.getUser();
      setUser(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: { user, session } } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      return { user, session };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    // First, create the auth user
    const { data: { user, session } } = await supabaseClient.auth.signUp({
      email,
      password
    });
    if (!user) throw new Error('Failed to create user');

    // Then create the user profile
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .insert({
        id: user.id, // This must match auth.uid() for RLS
        name: userData.name,
        gender: userData.gender,
        postcode: userData.postcode,
        constituency: userData.constituency,
        mp: userData.mp,
        selected_topics: userData.topics,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      await supabaseClient.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    return { user, session };
  };

  const updateProfile = async (userData: Partial<SignUpData>) => {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) throw profileError;
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    updateProfile,
    signOut: handleSignOut,
  };
}