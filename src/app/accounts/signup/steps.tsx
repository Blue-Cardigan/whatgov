import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPostcode, insertPostcodeSpace, UK_POSTCODE_REGEX } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { TOPICS } from "@/lib/utils";
import { lookupPostcode } from "@/lib/supabase";
import { ChartBarIcon } from "lucide-react";

type FormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  age: string;
  postcode: string;
  selectedTopics: string[];
};

interface StepsProps {
  step: number;
  formData: FormData;
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
  postcodeError: string;
  setPostcodeError: (error: string) => void;
  mpDetails: { mp: string | null; constituency: string | null; } | null;
  setMpDetails: (details: { mp: string | null; constituency: string | null; } | null) => void;
  isLookingUpPostcode: boolean;
  setIsLookingUpPostcode: (loading: boolean) => void;
}

export default function Steps({
  step,
  formData,
  setFormData,
  postcodeError,
  setPostcodeError,
  mpDetails,
  setMpDetails,
  isLookingUpPostcode,
  setIsLookingUpPostcode
}: StepsProps) {
  const handleTopicToggle = (topicId: string) => {
    setFormData((prev: FormData) => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topicId)
        ? prev.selectedTopics.filter((t: string) => t !== topicId)
        : [...prev.selectedTopics, topicId]
    }));
  };

  const handlePostcodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPostcode(value);
    
    // Only format with space if we have 7 characters
    const withSpace = formatted.length >= 7 ? insertPostcodeSpace(formatted) : formatted;
    
    setFormData((prev: FormData) => ({
      ...prev,
      postcode: withSpace
    }));

    // Clear MP details when postcode changes
    setMpDetails(null);

    // Only validate if there's a value
    if (withSpace) {
      if (!UK_POSTCODE_REGEX.test(withSpace)) {
        setPostcodeError("Please enter a valid UK postcode");
      } else {
        setPostcodeError("");
      }
    } else {
      setPostcodeError(""); // Clear error when empty
    }
  };

  const handlePostcodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatPostcode(e.target.value);
    const withSpace = insertPostcodeSpace(formatted);
    
    setFormData((prev: FormData) => ({
      ...prev,
      postcode: withSpace
    }));

    // Only validate and lookup if there's a value
    if (!withSpace) {
      setPostcodeError("");
      setMpDetails(null);
      return;
    }

    if (UK_POSTCODE_REGEX.test(withSpace)) {
      setPostcodeError("");
      setIsLookingUpPostcode(true);
      try {
        const details = await lookupPostcode(withSpace);
        if (details && details.mp && details.constituency) {
          setMpDetails({
            mp: details.mp,
            constituency: details.constituency
          });
        } else {
          setPostcodeError("Postcode not found");
          setMpDetails(null);
        }
      } catch {
        setPostcodeError("Could not find MP for this postcode");
        setMpDetails(null);
      } finally {
        setIsLookingUpPostcode(false);
      }
    } else {
      setPostcodeError("Please enter a valid UK postcode");
      setMpDetails(null);
    }
  };

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
            <h2 className="text-3xl font-semibold mb-3">Welcome! Let&apos;s get started</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              First, what should we call you?
            </p>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Your name"
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
            <h2 className="text-3xl font-semibold mb-3">What&apos;s your email?</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              We&apos;ll use this to sign you in
            </p>
            <Input
              id="email"
              name="email"
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
            <div className="space-y-4">
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Password"
                className="text-lg py-6"
                required
              />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword || ''}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm password"
                className="text-lg py-6"
                required
              />
            </div>
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
            <h2 className="text-3xl font-semibold mb-3">Where are you based?</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Enter your postcode to connect with your local MP (optional)
            </p>
            <div className="relative">
              <Input
                id="postcode"
                name="postcode"
                value={formData.postcode}
                onChange={handlePostcodeChange}
                onBlur={handlePostcodeBlur}
                placeholder="e.g. SW1A 1AA"
                className={cn(
                  "text-lg py-6",
                  postcodeError ? "border-red-500" : 
                  mpDetails ? "border-green-500" : ""
                )}
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

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Topics Selection */}
            <div>
              <h2 className="text-3xl font-semibold mb-3">Choose your interests</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Select topics you want to follow
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

            {/* Optional Demographics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-muted/50 p-6"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Help improve representation</h3>
                    <p className="text-sm text-muted-foreground">
                      Optional demographic data helps ensure diverse voices are heard
                    </p>
                  </div>
                </div>

                {/* Age Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Age group</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "18-24", icon: "🎓" },
                      { value: "25-34", icon: "💼" },
                      { value: "35-44", icon: "👨‍💼" },
                      { value: "45-54", icon: "👩‍💼" },
                      { value: "55-64", icon: "👨‍🦳" },
                      { value: "65+", icon: "🧓" },
                      { value: "prefer-not-to-say", icon: "🤝", label: "Skip" }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.age === option.value ? "default" : "outline"}
                        className={cn(
                          "h-auto py-2 px-3",
                          "flex flex-col items-center gap-1",
                          formData.age === option.value && "border-primary"
                        )}
                        onClick={() => setFormData({...formData, age: option.value})}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <span className="text-xs font-medium">
                          {option.label || option.value}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Gender Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Gender</label>
                  <div className="flex gap-2">
                    {[
                      { value: "male", label: "Male", icon: "👨" },
                      { value: "female", label: "Female", icon: "👩" },
                      { value: "other", label: "Other", icon: "🫂" },
                      { value: "prefer-not-to-say", label: "Skip", icon: "🤝" }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.gender === option.value ? "default" : "outline"}
                        className={cn(
                          "flex-1 h-auto py-2 px-3",
                          "flex flex-col items-center gap-1",
                          formData.gender === option.value && "border-primary"
                        )}
                        onClick={() => setFormData({...formData, gender: option.value})}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <span className="text-xs font-medium">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );
  }
}