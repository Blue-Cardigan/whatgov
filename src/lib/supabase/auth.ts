'use client'

import createClient from './client'
import type { AuthResponse } from '@/types/supabase'

export const signUpWithEmail = async (
  email: string, 
  password: string,
  profile: { organization?: string; role?: string }
): Promise<AuthResponse> => {
  const supabase = createClient();

  try {
    // First attempt to sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization: profile.organization,
          role: profile.role
        }
      }
    });

    if (signUpError) throw signUpError;

    // If signup successful, create the user profile using RPC
    if (authData.user) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_user_with_profile',
        {
          user_id: authData.user.id,
          user_email: email,
          user_organization: profile.organization || '',
          user_role: profile.role || ''
        }
      );

      if (rpcError) throw rpcError;
      if (!rpcData.success) throw new Error(rpcData.error || 'Failed to create profile');
    }

    // Send verification email
    const confirmationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accounts/verify`;
    
    const emailResponse = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        confirmationLink,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send verification email');
    }

    return {
      user: authData.user,
      session: authData.session,
      status: 'verify_email'
    };

  } catch (error) {
    console.error('Signup error:', error);
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 'error'
    };
  }
};

export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<AuthResponse> => {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: error.message
      };
    }

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        user: null,
        session: null,
        error: 'Please verify your email before signing in',
        status: 'verify_email'
      };
    }

    // Fetch profile data after successful authentication
    if (data.user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return {
          user: null,
          session: null,
          error: 'Failed to load user profile'
        };
      }

      return {
        user: data.user,
        session: data.session,
        profile
      };
    }

    return {
      user: data.user,
      session: data.session
    };

  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      session: null,
      error: 'An unexpected error occurred during sign in'
    };
  }
};

export const resendVerificationEmail = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  const supabase = createClient();
  
  try {
    // Generate a new verification token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_verification_token',
      { user_email: email }
    );

    if (tokenError) throw tokenError;
    if (!tokenData?.success) {
      throw new Error(tokenData?.error || 'Failed to generate verification token');
    }

    // Create confirmation link with the new token
    const encodedToken = encodeURIComponent(tokenData.confirmation_token);
    const confirmationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accounts/verify?token=${encodedToken}`;
    
    // Send the verification email
    const emailResponse = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        confirmationLink,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send verification email');
    }

    return { success: true };
  } catch (error) {
    console.error('Resend verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend verification email'
    };
  }
};

export const verifyEmail = async (
  token: string
): Promise<{ success: boolean; error?: string }> => {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.rpc('verify_user_email', {
      token
    });

    if (error) throw error;
    if (!data.success) {
      throw new Error(data.error || 'Verification failed');
    }

    // Send welcome email
    const welcomeResponse = await fetch('/api/auth/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        newsletter: data.newsletter
      }),
    });

    if (!welcomeResponse.ok) {
      console.error('Failed to send welcome email');
    }

    return { success: true };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify email'
    };
  }
};