"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lookupPostcode } from '@/lib/supabase';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import {
  Leaf,
  Heart,
  Building2,
  Microscope,
  Scale,
  Globe2,
  LandPlot,
  GraduationCap,
  type LucideIcon
} from "lucide-react";

const TOPICS: {
  id: string;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    id: "environment",
    label: "Environment and Natural Resources",
    icon: Leaf
  },
  {
    id: "healthcare",
    label: "Healthcare and Social Welfare",
    icon: Heart
  },
  {
    id: "economy",
    label: "Economy, Business, and Infrastructure",
    icon: Building2
  },
  {
    id: "science",
    label: "Science, Technology, and Innovation",
    icon: Microscope
  },
  {
    id: "legal",
    label: "Legal Affairs and Public Safety",
    icon: Scale
  },
  {
    id: "international",
    label: "International Relations and Diplomacy",
    icon: Globe2
  },
  {
    id: "parliamentary",
    label: "Parliamentary Affairs and Governance",
    icon: LandPlot
  },
  {
    id: "education",
    label: "Education, Culture, and Society",
    icon: GraduationCap
  }
];

function formatPostcode(input: string): string {
  // Remove all spaces and convert to uppercase
  return input.replace(/\s+/g, '').toUpperCase();
}

function insertPostcodeSpace(postcode: string): string {
  const clean = postcode.replace(/\s+/g, '');
  if (clean.length > 3) {
    return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
  }
  return clean;
}

// UK Postcode regex
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
    postcode: "",
    selectedTopics: [] as string[],
  });

  const [postcodeError, setPostcodeError] = useState("");
  const [mpDetails, setMpDetails] = useState<{
    mp: string;
    constituency: string;
  } | null>(null);

  const [stepValid, setStepValid] = useState(false);
  const [isLookingUpPostcode, setIsLookingUpPostcode] = useState(false);

  useEffect(() => {
    switch (step) {
      case 1:
        setStepValid(formData.name.length >= 2);
        break;
      case 2:
        setStepValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email));
        break;
      case 3:
        setStepValid(formData.password.length >= 8);
        break;
      case 4:
        setStepValid(!!formData.gender);
        break;
      case 5:
        setStepValid(!!mpDetails);
        break;
      case 6:
        setStepValid(formData.selectedTopics.length > 0);
        break;
    }
  }, [step, formData, mpDetails]);

  const handleTopicToggle = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topicId)
        ? prev.selectedTopics.filter(t => t !== topicId)
        : [...prev.selectedTopics, topicId]
    }));
  };

  const handlePostcodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPostcode(value);
    
    // Only format with space if we have 7 characters
    const withSpace = formatted.length >= 7 ? insertPostcodeSpace(formatted) : formatted;
    
    setFormData(prev => ({
      ...prev,
      postcode: withSpace
    }));

    // Clear MP details when postcode changes
    setMpDetails(null);

    // Validate the postcode
    if (withSpace && !UK_POSTCODE_REGEX.test(withSpace)) {
      setPostcodeError("Please enter a valid UK postcode");
    } else {
      setPostcodeError("");
    }
  };

  const handlePostcodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatPostcode(e.target.value);
    const withSpace = insertPostcodeSpace(formatted);
    
    setFormData(prev => ({
      ...prev,
      postcode: withSpace
    }));

    // Validate and lookup postcode
    if (withSpace && UK_POSTCODE_REGEX.test(withSpace)) {
      setPostcodeError("");
      setIsLookingUpPostcode(true);
      try {
        const details = await lookupPostcode(withSpace);
        if (details) {
          setMpDetails(details);
        } else {
          setPostcodeError("Postcode not found");
        }
      } catch (_) {
        setPostcodeError("Could not find MP for this postcode");
      } finally {
        setIsLookingUpPostcode(false);
      }
    } else {
      setPostcodeError("Please enter a valid UK postcode");
      setMpDetails(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for specific steps
    if (step === 5) {
      if (formData.postcode && !UK_POSTCODE_REGEX.test(formData.postcode)) {
        setError("Please enter a valid UK postcode");
        return;
      }
      if (!mpDetails) {
        setError("Please enter a valid postcode to find your MP");
        return;
      }
    }

    if (step === 6 && formData.selectedTopics.length === 0) {
      setError("Please select at least one topic");
      return;
    }

    if (step < 6) {
      setStep(step + 1);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Map topic IDs to labels for the API
      const topicLabels = formData.selectedTopics.map(
        id => TOPICS.find(t => t.id === id)?.label ?? ""
      );

      await signUp(formData.email, formData.password, {
        name: formData.name,
        gender: formData.gender,
        postcode: formData.postcode,
        constituency: mpDetails?.constituency || "",
        mp: mpDetails?.mp || "",
        topics: topicLabels, // Send labels to the API
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-semibold mb-3">Welcome! Let's get started</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                First, what should we call you?
              </p>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Your full name"
                className="text-lg py-6"
                required
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-2">
                This will be displayed on your profile
              </p>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-semibold mb-3">What's your email?</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                We&apos;ll use this to sign you in
              </p>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Email address"
                className="text-lg py-6"
                required
              />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-semibold mb-3">Create a password</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Make it strong and memorable
              </p>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Password"
                className="text-lg py-6"
                required
              />
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-semibold mb-3">Tell us about yourself</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                This helps us personalize your experience
              </p>
              <div className="space-y-4">
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({...formData, gender: value})}
                >
                  <SelectTrigger className="text-lg py-6">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-semibold mb-3">Where are you based?</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                We&apos;ll use this to find your local MP
              </p>
              <div className="relative">
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={handlePostcodeChange}
                  onBlur={handlePostcodeBlur}
                  placeholder="e.g., SW1A 1AA"
                  className={cn(
                    "text-lg py-6",
                    postcodeError ? "border-red-500" : 
                    mpDetails ? "border-green-500" : ""
                  )}
                  required
                  maxLength={8}
                  autoCapitalize="characters"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <AnimatePresence mode="wait">
                    {isLookingUpPostcode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      </motion.div>
                    )}
                    {mpDetails && !isLookingUpPostcode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {postcodeError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-500"
                >
                  {postcodeError}
                </motion.p>
              )}
              <AnimatePresence>
                {mpDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-6 bg-muted rounded-lg border"
                  >
                    <h3 className="font-medium mb-2">Your MP</h3>
                    <p className="text-xl font-semibold">{mpDetails.mp}</p>
                    <p className="text-muted-foreground mt-1">
                      {mpDetails.constituency}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl font-semibold mb-3">Choose your interests</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                You&apos;re interested in
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TOPICS.map((topic) => {
                  const isSelected = formData.selectedTopics.includes(topic.id);
                  const Icon = topic.icon;
                  
                  return (
                    <motion.div
                      key={topic.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "w-full cursor-pointer transition-all py-4 px-4",
                          isSelected ? "bg-primary hover:bg-primary/90" : "hover:bg-muted",
                          "flex items-center justify-between gap-3"
                        )}
                        onClick={() => handleTopicToggle(topic.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="text-sm font-medium">{topic.label}</span>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                          </motion.div>
                        )}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
              {formData.selectedTopics.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Please select at least one topic
                </p>
              )}
            </div>
          </motion.div>
        );
    }
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
              {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
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
              Step {step} of 6
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
                {renderStep()}
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
                type="submit"
                className={cn(
                  "w-full py-6 text-lg",
                  "transition-all duration-300",
                  stepValid ? "bg-primary hover:bg-primary/90" : "bg-primary/50"
                )}
                disabled={loading || !stepValid}
              >
                {step < 6 ? (
                  <span className="flex items-center">
                    Next
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </span>
                ) : loading ? (
                  "Creating..."
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