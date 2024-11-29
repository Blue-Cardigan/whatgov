"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import createClient from "@/lib/supabase/client";
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { resendVerificationEmail, verifyEmail } from "@/lib/supabase";

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

  // Get email from URL params, localStorage, or token
  useEffect(() => {
    const getEmailFromToken = async (token: string) => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_email_from_token', {
          verification_token: token
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        setEmail(data.email);
      } catch (err) {
        console.error('Error getting email from token:', err);
        // Don't set error state here as the token verification will handle that
      }
    };

    const emailFromStorage = localStorage.getItem('verification_email');
    const token = searchParams.get('token');
    
    if (emailFromStorage) {
      setEmail(emailFromStorage);
    } else if (token) {
      getEmailFromToken(token);
    }
  }, [searchParams]);

  // Handle token verification
  useEffect(() => {
    const verifyToken = async (token: string, type: string) => {
      setIsVerifying(true);
      try {
        if (type === 'email_change') {
          // Handle email change confirmation through Supabase Auth
          const supabase = createClient();
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email_change'
          });
          
          if (error) throw error;
          
          toast({
            title: "Email updated",
            description: "Your email has been successfully updated.",
          });
          
          router.push('/accounts/profile');
        } else {
          // Use the centralized verification function
          const { success, error } = await verifyEmail(token);
          
          if (!success) throw new Error(error);
          
          setVerificationStatus('success');
          localStorage.removeItem('verification_email');
          
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
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

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const type = params.get('type');
    
    if (token) {
      verifyToken(token, type || 'signup');
    }
  }, [router]);

  const handleResendEmail = async () => {
    setResendStatus('loading');
    setError(null);

    if (!email) {
      setError('No email address found. Please try signing up again.');
      setResendStatus('error');
      return;
    }

    try {
      const { success, error } = await resendVerificationEmail(email);
      
      if (!success) {
        throw new Error(error);
      }
      
      setResendStatus('success');
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      });
    } catch (err) {
      console.error('Error resending verification email:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to resend verification email'
      );
      setResendStatus('error');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
      });
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
      setCountdown(10);
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
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const isEmailChange = type === 'email_change';

    switch (verificationStatus) {
      case 'success':
        return (
          <div className="text-center mb-6">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">
              {isEmailChange ? 'Email Updated!' : 'Email Verified!'}
            </h1>
            <p className="text-muted-foreground">
              {isEmailChange 
                ? 'Your email has been successfully updated. Redirecting to your profile...'
                : 'Your email has been successfully verified. Redirecting you to sign in...'}
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center mb-6">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Verification Failed</h1>
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/login')}
            >
              Return to login
            </Button>
          </div>
        );

      case 'pending':
        return (
          <div className="text-center mb-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">
              {isEmailChange ? 'Confirming Email Change' : 'Verifying Email'}
            </h1>
            {!isVerifying && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Didn&apos;t receive the email? Check your spam folder or try resending.
                </p>
                <Button
                  onClick={handleResendEmail}
                  disabled={resendStatus === 'loading' || resendStatus === 'success'}
                  className="w-full max-w-xs"
                >
                  {resendStatus === 'loading' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : resendStatus === 'success' ? (
                    `Resend available in ${countdown}s`
                  ) : (
                    'Resend verification email'
                  )}
                </Button>
                {error && (
                  <p className="text-sm text-destructive mt-2">{error}</p>
                )}
              </div>
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