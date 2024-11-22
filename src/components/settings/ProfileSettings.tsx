'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from "@/components/ui/badge";
import { TOPICS } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPostcode, insertPostcodeSpace, UK_POSTCODE_REGEX } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { lookupPostcode } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import type { UserProfile } from '@/types/supabase';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export function ProfileSettings() {
  const { user, profile: originalProfile, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLookingUpPostcode, setIsLookingUpPostcode] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  // Initialize profile from useAuth
  useEffect(() => {
    if (originalProfile) {
      setProfile(originalProfile);
    }
  }, [originalProfile]);

  // Check for changes
  useEffect(() => {
    if (!profile || !originalProfile) return;
    
    const hasProfileChanges = Object.entries(profile).some(([key, value]) => {
      if (key === 'selected_topics') {
        return JSON.stringify(value) !== JSON.stringify(originalProfile[key as keyof UserProfile]);
      }
      return value !== originalProfile[key as keyof UserProfile];
    });

    setHasChanges(hasProfileChanges);
  }, [profile, originalProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !hasChanges) return;

    setIsLoading(true);
    
    try {
      await updateProfile({
        name: profile.name,
        postcode: profile.postcode,
        constituency: profile.constituency,
        mp: profile.mp,
        gender: profile.gender,
        age: profile.age,
        selected_topics: profile.selected_topics,
      });

      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostcodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPostcode(value);
    const withSpace = formatted.length >= 7 ? insertPostcodeSpace(formatted) : formatted;
    
    setProfile(prev => ({
      ...prev!,
      postcode: withSpace,
      constituency: "",
      mp: ""
    }));

    if (withSpace && !UK_POSTCODE_REGEX.test(withSpace)) {
      setPostcodeError("Please enter a valid UK postcode");
    } else {
      setPostcodeError("");
    }
  };

  // Add delete account handler
  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      
      // Call the RPC function to delete the account
      const { data, error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete account');

      // Sign out after successful deletion
      await supabase.auth.signOut();
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });

      // Redirect to home page
      router.push('/');
      
    } catch (err) {
      console.error('Error deleting account:', err);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePostcodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatPostcode(e.target.value);
    const withSpace = insertPostcodeSpace(formatted);
    
    setProfile(prev => ({
      ...prev!,
      postcode: withSpace
    }));

    if (!withSpace) {
      setPostcodeError("");
      return;
    }

    if (UK_POSTCODE_REGEX.test(withSpace)) {
      setPostcodeError("");
      setIsLookingUpPostcode(true);
      try {
        const details = await lookupPostcode(withSpace);
        if (details && details.mp && details.constituency) {
          setProfile(prev => ({
            ...prev!,
            mp: details.mp,
            constituency: details.constituency
          }));
        } else {
          setPostcodeError("Postcode not found");
        }
      } catch {
        setPostcodeError("Could not find MP for this postcode");
      } finally {
        setIsLookingUpPostcode(false);
      }
    } else {
      setPostcodeError("Please enter a valid UK postcode");
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile information and email settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info section */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Location section */}
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <div className="relative">
                  <Input
                    id="postcode"
                    value={profile.postcode}
                    onChange={handlePostcodeChange}
                    onBlur={handlePostcodeBlur}
                    placeholder="e.g., SW1A 1AA"
                    className={cn(
                      postcodeError ? "border-red-500" : 
                      profile.mp ? "border-green-500" : ""
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
                      {profile.mp && !isLookingUpPostcode && (
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
                    className="text-sm text-red-500"
                  >
                    {postcodeError}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Your Member of Parliament</Label>
                {profile.mp ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-muted rounded-lg border h-[40px] flex flex-col justify-center"
                  >
                    <p className="font-medium">{profile.mp}</p>
                    <p className="text-muted-foreground text-sm">{profile.constituency}</p>
                  </motion.div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg border border-dashed h-[40px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Enter your postcode to find your MP</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gender section */}
          <div className="space-y-3">
            <Label>Gender</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "male", label: "Male", icon: "👨" },
                { value: "female", label: "Female", icon: "👩" },
                { value: "other", label: "Other", icon: "🫂" },
                { value: "prefer-not-to-say", label: "Prefer not to say", icon: "🤝" }
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={profile.gender === option.value ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2",
                    "flex items-center justify-center gap-2",
                    profile.gender === option.value && "border-primary"
                  )}
                  onClick={() => setProfile({ ...profile, gender: option.value })}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Age section */}
          <div className="space-y-3">
            <Label>Age Range</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "under-18", label: "Under 18", icon: "👶" },
                { value: "18-24", label: "18-24", icon: "🎓" },
                { value: "25-34", label: "25-34", icon: "💼" },
                { value: "35-44", label: "35-44", icon: "👨‍💼" },
                { value: "45-54", label: "45-54", icon: "👩‍💼" },
                { value: "55-64", label: "55-64", icon: "👨‍🦳" },
                { value: "65+", label: "65+", icon: "🧓" },
                { value: "prefer-not-to-say", label: "Prefer not to say", icon: "🤝" }
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={profile.age === option.value ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2",
                    "flex items-center justify-center gap-2",
                    profile.age === option.value && "border-primary"
                  )}
                  onClick={() => setProfile({ ...profile, age: option.value })}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Topics section */}
          <div className="space-y-3">
            <Label>Topics of Interest</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map((topic) => {
                const isSelected = profile.selected_topics.includes(topic.id);
                const Icon = topic.icon;
                
                return (
                  <Badge
                    key={topic.id}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "w-full cursor-pointer py-2 px-3",
                      isSelected ? "bg-primary hover:bg-primary/90" : "hover:bg-muted",
                      "flex items-center justify-between"
                    )}
                    onClick={() => {
                      setProfile({
                        ...profile,
                        selected_topics: isSelected
                          ? profile.selected_topics.filter(t => t !== topic.id)
                          : [...profile.selected_topics, topic.id]
                      });
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{topic.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !hasChanges}
            className={cn(
              "w-full",
              !hasChanges && "opacity-50"
            )}
          >
            {isLoading ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </Button>
        </CardContent>
        <CardContent className="border-t pt-6 mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-destructive">Delete Account</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>

            {showDeleteConfirm && (
              <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                <h4 className="font-medium text-destructive mb-2">Are you absolutely sure?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete your account, all your votes, and personal data. 
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    className="w-full sm:w-auto"
                  >
                    Yes, Delete My Account
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
} 