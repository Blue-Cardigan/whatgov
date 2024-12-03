'use client'

import createClient from './client'
import type { AuthResponse, UserProfile } from '@/types/supabase'
import { User } from '@supabase/supabase-js'

export const signUpWithEmail = async (
  email: string, 
  password: string,
  profile: UserProfile
): Promise<AuthResponse> => {
  const serviceClient = createClient();

  try {
    // First check if user exists and is verified
    const { data: existingUser, error: checkError } = await serviceClient
      .from('user_profiles')
      .select('email_verified')
      .eq('email', email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // If user exists and is verified, return special status
    if (existingUser?.email_verified) {
      return {
        user: null,
        session: null,
        error: 'An account with this email already exists',
        status: 'redirect_to_login'
      };
    }

    // Proceed with signup
    const { data, error } = await serviceClient.rpc(
      'create_user_with_profile',
      {
        user_email: email,
        user_password: password,
        user_name: profile.name || '',
        user_gender: profile.gender || '',
        user_postcode: profile.postcode || '',
        user_constituency: profile.constituency || '',
        user_mp: profile.mp || '',
        user_mp_id: profile.mp_id || null,
        user_selected_topics: profile.selected_topics || [],
        user_newsletter: profile.newsletter ?? true
      }
    );

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'User creation failed');

    const encodedToken = encodeURIComponent(data.confirmation_token);
    const confirmationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accounts/verify?token=${encodedToken}`;
    
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

    if (typeof window !== 'undefined') {
      localStorage.setItem('verification_email', email);
    }

    return {
      user: { id: data.user_id, email } as User,
      session: null,
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