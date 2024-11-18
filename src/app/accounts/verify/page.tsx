"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useSearchParams, useRouter } from 'next/navigation';

// Create a separate component for the verification logic
function VerificationHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [countdown, setCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);

  // Get email from URL params or localStorage on mount
  useEffect(() => {
    const emailFromStorage = localStorage.getItem('verification_email');
    
    if (emailFromStorage) {
      setEmail(emailFromStorage);
    }
  }, []);

  // Handle token verification
  useEffect(() => {
    const verifyToken = async (token: string) => {
      setIsVerifying(true);
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase.rpc('verify_user_email', {
          token: token
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Verification failed');

        setVerificationStatus('success');
        localStorage.removeItem('verification_email');
        
        setTimeout(() => {
          router.push('/accounts/signin');
        }, 2000);

      } catch (err) {
        console.error('Error verifying email:', err);
        setVerificationStatus('error');
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to verify email address'
        );
      } finally {
        setIsVerifying(false);
      }
    };

    const token = searchParams.get('token');
    
    if (token) {
      verifyToken(token);
    }
  }, [searchParams, router]);

  const handleResendEmail = async () => {
    setResendStatus('loading');
    setError(null);

    if (!email) {
      setError('No email address found. Please try signing up again.');
      setResendStatus('error');
      return;
    }

    try {
      const supabase = createClient();
      
      // First, get a new confirmation token
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        'generate_confirmation_token',
        { user_email: email }
      );

      if (tokenError) throw tokenError;
      if (!tokenData?.confirmation_token) {
        throw new Error('Failed to generate confirmation token');
      }

      // Create confirmation link with the new token
      const encodedToken = encodeURIComponent(tokenData.confirmation_token);
      const confirmationLink = `${window.location.origin}/accounts/verify?token=${encodedToken}`;
      
      // Send the verification email through our API route
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
      
      setResendStatus('success');
    } catch (err) {
      console.error('Error resending verification email:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to resend verification email'
      );
      setResendStatus('error');
    }
  };

  // Add countdown effect for resend cooldown
  useEffect(() => {
    if (resendStatus === 'success' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (countdown === 0) {
      setResendStatus('idle');
      setCountdown(60);
    }
  }, [countdown, resendStatus]);

  // Clear stored email on unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem('verification_email');
    };
  }, []);

  // Render different content based on verification status
  const renderContent = () => {
    switch (verificationStatus) {
      case 'success':
        return (
          <div className="text-center mb-6">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">
              Email Verified!
            </h1>
            <p className="text-muted-foreground">
              Your email has been successfully verified. Redirecting you to sign in...
            </p>
          </div>
        );

      case 'error':
      case 'pending':
        return (
          <div className="text-center mb-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">
              Check your email
            </h1>
            <p className="text-muted-foreground">
              We&apos;ve sent you a verification link. Please check your email to continue.
            </p>
            {email && (
              <p className="text-sm text-muted-foreground mt-2">
                Verification email sent to <span className="font-medium">{email}</span>
              </p>
            )}
            
            {/* Add loading indicator during verification */}
            {isVerifying && (
              <div className="mt-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"
                />
                <p className="text-sm text-muted-foreground mt-2">Verifying your email...</p>
              </div>
            )}

            {/* Add resend button section */}
            {!isVerifying && (
              <div className="mt-6">
                <button
                  onClick={handleResendEmail}
                  disabled={resendStatus === 'loading' || resendStatus === 'success'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${resendStatus === 'loading' || resendStatus === 'success'
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                >
                  {resendStatus === 'loading' && 'Sending...'}
                  {resendStatus === 'success' && `Resend available in ${countdown}s`}
                  {resendStatus === 'idle' && 'Resend verification email'}
                </button>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return renderContent();
}

// Main component
export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="container max-w-lg mx-auto p-8">
        <motion.div 
          className="bg-background rounded-xl shadow-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Suspense fallback={
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"
              />
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          }>
            <VerificationHandler />
          </Suspense>
        </motion.div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Having trouble?{" "}
            <Link 
              href="/support" 
              className="text-primary hover:underline font-medium"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 