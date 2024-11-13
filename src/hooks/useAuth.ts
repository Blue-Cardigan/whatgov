import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signInWithEmail, signUpWithEmail } from '@/lib/supabase';

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    // First, create the auth user
    const { user, session } = await signUpWithEmail(email, password);
    if (!user) throw new Error('Failed to create user');

    // Then create the user profile
    const { error: profileError } = await supabase
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
      await supabase.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    return { user, session };
  };

  const updateProfile = async (userData: Partial<SignUpData>) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    const { error: profileError } = await supabase
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
    signIn: signInWithEmail,
    signUp,
    updateProfile,
    signOut: handleSignOut,
  };
}