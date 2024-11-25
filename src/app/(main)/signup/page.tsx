"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn, UK_POSTCODE_REGEX } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { TOPICS } from "@/lib/utils";
import Steps from "./steps";
import { migrateAnonymousVotes } from "@/lib/supabase";

export default function SignUp() {
  const [error, setError] = useState("");
  const { signUp: signUpWithAuth } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    age: "",
    postcode: "",
    selectedTopics: TOPICS.map(topic => topic.id),
    newsletter: true,
  });

  const [postcodeError, setPostcodeError] = useState("");
  const [mpDetails, setMpDetails] = useState<{
    mp: string | null;
    constituency: string | null;
  } | null>(null);

  const [stepValid, setStepValid] = useState(false);
  const [isLookingUpPostcode, setIsLookingUpPostcode] = useState(false);
  
  const [loadingStates, setLoadingStates] = useState({
    postcodeLookup: false,
    submission: false
  });

  const [migrationStatus, setMigrationStatus] = useState<{
    total: number;
    migrated: number;
  } | null>(null);

  const TOTAL_STEPS = 5;

  useEffect(() => {
    switch (step) {
      case 1:
        setStepValid(formData.name.trim().length >= 2);
        break;
      case 2:
        setStepValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email));
        break;
      case 3:
        setStepValid(
          formData.password.length >= 8 && 
          formData.password === formData.confirmPassword
        );
        break;
      case 4:
        setStepValid(
          !formData.postcode || 
          UK_POSTCODE_REGEX.test(formData.postcode)
        );
        break;
      case 5:
        setStepValid(formData.selectedTopics.length > 0);
        break;
    }
  }, [step, formData]);

  const migrateVotes = async () => {
    const ANON_VOTES_KEY = 'whatgov_anon_votes';
    try {
      // Get anonymous votes from localStorage
      const votes = JSON.parse(localStorage.getItem(ANON_VOTES_KEY) || '[]');
      if (!votes.length) return true;

      setMigrationStatus({ total: votes.length, migrated: 0 });
      
      const { success, error } = await migrateAnonymousVotes(votes);
      
      if (success) {
        // Clear anonymous votes after successful migration
        localStorage.removeItem(ANON_VOTES_KEY);
        return true;
      } else {
        throw new Error(error || 'Failed to migrate votes');
      }
    } catch (error) {
      console.error('Vote migration error:', error);
      return false;
    } finally {
      setMigrationStatus(null);
    }
  };

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
      const topicLabels = formData.selectedTopics.map(
        id => TOPICS.find(t => t.id === id)?.label ?? ""
      );

      const response = await signUpWithAuth(formData.email, formData.password, {
        name: formData.name || "",
        gender: formData.gender || "",
        age: formData.age || "",
        postcode: formData.postcode || "",
        constituency: mpDetails?.constituency || "",
        mp: mpDetails?.mp || "",
        selected_topics: topicLabels,
        newsletter: formData.newsletter,
      });

      if (!response) {
        throw new Error('Signup failed - no response received');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.status === 'verify_email') {
        // Attempt to migrate votes before redirecting
        const migrationSuccess = await migrateVotes();
        if (!migrationSuccess) {
          console.warn('Vote migration failed - votes will remain in localStorage');
        }
        
        localStorage.setItem('verification_email', formData.email);
        router.push('/accounts/verify');
      } else {
        throw new Error('Unexpected response status');
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
  // Add step-specific validation
  const validateCurrentStep = (): boolean => {
    switch (step) {
      case 1:
        if (formData.name.trim().length < 2) {
          setError("Please enter your full name (minimum 2 characters)");
          return false;
        }
        break;

      case 2:
        if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          setError("Please enter a valid email address");
          return false;
        }
        break;

      case 3:
        if (formData.password.length < 8) {
          setError("Password must be at least 8 characters long");
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return false;
        }
        break;

      case 4:
        if (formData.postcode && !UK_POSTCODE_REGEX.test(formData.postcode)) {
          setError("Please enter a valid UK postcode or leave it empty");
          return false;
        }
        break;

      case 5:
        if (formData.selectedTopics.length === 0) {
          setError("Please select at least one topic");
          return false;
        }
        break;
    }

    setError(""); // Clear any existing errors
    return true;
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

    if (formData.selectedTopics.length === 0) {
      setError("No topics selected");
      setStep(5);
      return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="container max-w-2xl mx-auto p-8">
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
                    postcodeError={postcodeError}
                    setPostcodeError={setPostcodeError}
                    mpDetails={mpDetails}
                    setMpDetails={setMpDetails}
                    isLookingUpPostcode={isLookingUpPostcode}
                    setIsLookingUpPostcode={setIsLookingUpPostcode}
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
                    stepValid ? "bg-primary hover:bg-primary/90" : "bg-primary/50"
                  )}
                  disabled={loadingStates.submission || !stepValid}
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
      {migrationStatus && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Migrating your votes ({migrationStatus.migrated}/{migrationStatus.total})
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
} 