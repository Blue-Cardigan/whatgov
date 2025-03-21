"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import Steps from "./steps";
import { SimpleFooter } from '@/components/layout/SimpleFooter';

const TOTAL_STEPS = 3;

export default function SignUp() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loadingStates, setLoadingStates] = useState({
    submission: false,
    postcode: false
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    role: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < TOTAL_STEPS) {
      if (!validateCurrentStep()) {
        return;
      }
      setStep(step + 1);
      return;
    }

    if (!validateAllSteps()) return;

    setLoadingStates(prev => ({ ...prev, submission: true }));
    setError("");

    try {
      const response = await signUp(formData.email, formData.password, {
        organization: formData.organization,
        role: formData.role
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.status === 'verify_email') {
        localStorage.setItem('verification_email', formData.email);
        router.push('/accounts/verify');
      } else if (response.user?.id) {
        router.push('/');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(
        err instanceof Error 
          ? err.message
          : 'An unexpected error occurred during signup'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoadingStates(prev => ({ ...prev, submission: false }));
    }
  };

  // Update the validateCurrentStep function
  const validateCurrentStep = (): boolean => {
    let isValid = true;
    
    switch (step) {
      case 1:
        if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          isValid = false;
        }
        break;

      case 2:
        if (formData.password.length < 8 || formData.password !== formData.confirmPassword) {
          isValid = false;
        }
        break;

      case 3:
        if (formData.role.trim().length < 2) {
          isValid = false;
        }
        break;

      case 4:
        isValid = true;
        break;
    }

    return isValid;
  };

  // Validate all steps before final submission
  const validateAllSteps = (): boolean => {
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Invalid email address");
      setStep(2);
      return false;
    }

    if (formData.password.length < 8) {
      setError("Invalid password");
      setStep(3);
      return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="container max-w-2xl mx-auto p-8 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div 
            className="bg-background rounded-xl shadow-lg p-8 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <div className="flex flex-col space-y-1 absolute left-0 top-0 bottom-0 w-1">
                {[1, 2, 3, 4, 5].map((stepNumber) => (
                  <div 
                    key={stepNumber}
                    className={cn(
                      "flex-1 transition-all duration-500",
                      stepNumber <= step ? "bg-primary" : "bg-muted"
                    )}
                  >
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="min-h-[400px] flex flex-col">
                <AnimatePresence mode="wait">
                  <Steps 
                    step={step}
                    formData={formData}
                    setFormData={setFormData}
                  />
                </AnimatePresence>
              </div>

              <div className="flex space-x-4 pt-6">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="w-full py-6 text-lg"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type={step === TOTAL_STEPS ? "submit" : "button"}
                  onClick={step < TOTAL_STEPS ? handleSubmit : undefined}
                  className={cn(
                    "w-full py-6 text-lg",
                    "transition-all duration-300",
                    validateCurrentStep() ? "bg-primary hover:bg-primary/90" : "bg-primary/50"
                  )}
                  disabled={loadingStates.submission}
                >
                  {step < TOTAL_STEPS ? (
                    <span className="flex items-center">
                      Next
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </span>
                  ) : loadingStates.submission ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    "Finish"
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                By continuing, you agree to our{" "}
                <Link href="/about/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/about/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </motion.div>
        </AnimatePresence>

        <p className="mt-8 text-center text-sm">
          Already have an account?{" "}
          <Link href='/login' className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
      <SimpleFooter />
    </div>
  );
} 