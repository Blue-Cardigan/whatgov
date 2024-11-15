"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn, UK_POSTCODE_REGEX } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { TOPICS } from "@/lib/utils";
import Steps from "./steps";

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
    selectedTopics: [] as string[],
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

  useEffect(() => {
    switch (step) {
      case 1:
        setStepValid(true);
        break;
      case 2:
        setStepValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email));
        break;
      case 3:
        setStepValid(formData.password.length >= 8);
        break;
      case 4:
        setStepValid(true);
        break;
      case 5:
        setStepValid(true);
        break;
      case 6:
        setStepValid(true);
        break;
      case 7:
        setStepValid(formData.selectedTopics.length > 0);
        break;
    }
  }, [step, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If not on the final step, just move to next step
    if (step < 7) {
      if (!validateCurrentStep()) {
        return;
      }
      setStep(step + 1);
      return;
    }

    // Final submission
    if (!validateAllSteps()) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, submission: true }));
    setError("");

    try {
      const topicLabels = formData.selectedTopics.map(
        id => TOPICS.find(t => t.id === id)?.label ?? ""
      );

      const response = await signUpWithAuth(formData.email, formData.password, {
        name: formData.name || "",
        gender: formData.gender || "",
        postcode: formData.postcode || "",
        constituency: mpDetails?.constituency || "",
        mp: mpDetails?.mp || "",
        selected_topics: topicLabels,
      });

      if (!response) {
        throw new Error('Signup failed - no response received');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.status === 'verify_email') {
        localStorage.setItem('verification_email', formData.email);
        router.push('/auth/verify');
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
        if (!formData.gender) {
          formData.gender = "-";
        }
        break;

      case 6:
        if (!formData.age) {
          formData.age = "-";
        }
        break;

      case 7:
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
      setStep(7);
      return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="container max-w-2xl mx-auto p-8">
        <motion.div 
          className="bg-background rounded-xl shadow-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7].map((stepNumber) => (
                <div key={stepNumber} className="flex-1">
                  <div className="relative">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        stepNumber === step ? "bg-primary" : 
                        stepNumber < step ? "bg-primary/40" : 
                        "bg-muted"
                      )}
                    />
                    {stepNumber < step && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 bg-primary rounded-full p-0.5"
                      >
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Step {step} of 7
            </p>
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
                type={step === 7 ? "submit" : "button"}
                onClick={step < 7 ? handleSubmit : undefined}
                className={cn(
                  "w-full py-6 text-lg",
                  "transition-all duration-300",
                  stepValid ? "bg-primary hover:bg-primary/90" : "bg-primary/50"
                )}
                disabled={loadingStates.submission || !stepValid}
              >
                {step < 7 ? (
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
          </form>
        </motion.div>

        <p className="mt-8 text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
} 