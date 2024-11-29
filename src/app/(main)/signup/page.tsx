"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn, UK_POSTCODE_REGEX } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { TOPICS } from "@/lib/utils";
import Steps from "./steps";
import { migrateAnonymousVotes } from "@/lib/supabase";
import { SimpleFooter } from '@/components/layout/SimpleFooter';

interface MigrationStatus {
  total: number;
  migrated: number;
}

interface MPDetails {
  mp: string | null;
  constituency: string | null;
}

const TOTAL_STEPS = 5;

export default function SignUp() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    submission: false,
    postcode: false
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    postcode: "",
    gender: "",
    age: "",
    selectedTopics: [] as string[],
    newsletter: false
  });
  const [mpDetails, setMpDetails] = useState<MPDetails | null>(null);
  const [postcodeError, setPostcodeError] = useState("");
  const [isLookingUpPostcode, setIsLookingUpPostcode] = useState(false);

  // Validation state
  const [isStepValid, setIsStepValid] = useState(false);

  // Validate current step
  const validateCurrentStep = (): boolean => {
    switch (step) {
      case 1:
        return Boolean(
          formData.email && 
          formData.password && 
          formData.password === formData.confirmPassword &&
          formData.password.length >= 8
        );
      case 2:
        return Boolean(formData.name);
      case 3:
        return Boolean(formData.postcode && UK_POSTCODE_REGEX.test(formData.postcode));
      case 4:
        return Boolean(formData.gender && formData.age);
      case 5:
        return formData.selectedTopics.length > 0;
      default:
        return false;
    }
  };

  // Update step validity whenever relevant data changes
  useEffect(() => {
    setIsStepValid(validateCurrentStep());
  }, [step, formData]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const migrateVotes = async (userId: string) => {
    const ANON_VOTES_KEY = 'whatgov_anon_votes';
    try {
      const votes = JSON.parse(localStorage.getItem(ANON_VOTES_KEY) || '[]');
      if (!votes.length) return true;

      setMigrationStatus({ total: votes.length, migrated: 0 });
      
      const { success, error } = await migrateAnonymousVotes(votes, userId);
      
      if (success) {
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

    if (!validateCurrentStep()) return;

    setLoadingStates(prev => ({ ...prev, submission: true }));
    setError("");

    try {
      const topicLabels = formData.selectedTopics.map(
        id => TOPICS.find(t => t.id === id)?.label ?? ""
      );

      const { error } = await signUp(formData.email, formData.password, {
        name: formData.name || "",
        gender: formData.gender || "",
        age: formData.age || "",
        postcode: formData.postcode || "",
        constituency: mpDetails?.constituency || null,
        mp: mpDetails?.mp || null,
        selected_topics: topicLabels,
        newsletter: formData.newsletter,
      });

      if (error) {
        throw new Error(error);
      }

      // Store email for verification page and redirect
      localStorage.setItem('verification_email', formData.email);
      
      // Migrate votes if there are any
      const anonVotes = JSON.parse(localStorage.getItem('whatgov_anon_votes') || '[]');
      if (anonVotes.length > 0) {
        console.log('Anonymous votes found, they will be migrated on first login');
      }
      
      // Redirect to verification page
      router.push('/accounts/verify');
      
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* ... rest of the JSX ... */}
      <Button
        type={step === TOTAL_STEPS ? "submit" : "button"}
        onClick={step < TOTAL_STEPS ? handleSubmit : undefined}
        className={cn(
          "w-full py-6 text-lg",
          "transition-all duration-300",
          isStepValid ? "bg-primary hover:bg-primary/90" : "bg-primary/50"
        )}
        disabled={loadingStates.submission || !isStepValid}
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
      {/* ... rest of the JSX ... */}
    </div>
  );
} 