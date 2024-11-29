"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SimpleFooter } from '@/components/layout/SimpleFooter';

function VerifiedMessage() {
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');
  const reset = searchParams.get('reset');

  if (!verified && !reset) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {verified ? "Email verified successfully! Please sign in." : 
           "Password reset successfully! Please sign in with your new password."}
        </span>
      </div>
    </motion.div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { signIn, resetPassword, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setIsResetting(true);

    try {
      const { success, error } = await resetPassword(email);
      if (success) {
        setResetSent(true);
      } else {
        setError(error || "Failed to send reset email");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div>
      {resetSent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-lg mb-6"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Password reset email sent! Please check your inbox.</span>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-primary hover:underline disabled:opacity-50"
              disabled={isResetting || !email}
            >
              {isResetting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </span>
              ) : (
                "Forgot password?"
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}

export default function SignIn() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-md mx-auto mt-16 px-4 flex-1 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">Sign In</h1>
        
        <Suspense fallback={null}>
          <VerifiedMessage />
        </Suspense>

        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>

        <SimpleFooter />
      </div>
    </div>
  );
} 