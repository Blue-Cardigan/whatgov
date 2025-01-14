'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, AlertCircle, Loader2, User, MapPin, Cake, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPostcode, insertPostcodeSpace, UK_POSTCODE_REGEX } from "@/lib/utils";
import { lookupPostcode } from "@/lib/supabase/mpsearch";
import { AnimatePresence, motion } from "framer-motion";
import type { UserProfile } from '@/types/supabase';
import createClient from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBeforeUnload } from '@/hooks/use-before-unload';

export function ProfileSettings() {
  const { profile: originalProfile, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLookingUpPostcode, setIsLookingUpPostcode] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

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
      return value !== originalProfile[key as keyof UserProfile];
    });

    setHasChanges(hasProfileChanges);
  }, [profile, originalProfile]);

  // Save changes when user leaves the page
  useBeforeUnload(
    useCallback(async () => {
      if (hasChanges && profile) {
        try {
          await updateProfile({
            name: profile.name,
            postcode: profile.postcode,
            constituency: profile.constituency,
            mp: profile.mp,
            gender: profile.gender,
            age: profile.age,
            newsletter: profile.newsletter,
          });
        } catch (error) {
          console.error('Error saving changes:', error);
        }
      }
    }, [hasChanges, profile, updateProfile])
  );

  // Save changes when changing tabs
  const handleTabChange = async (newTab: string) => {
    if (hasChanges && profile) {
      setIsSaving(true);
      try {
        await updateProfile({
          name: profile.name,
          postcode: profile.postcode,
          constituency: profile.constituency,
          mp: profile.mp,
          gender: profile.gender,
          age: profile.age,
          newsletter: profile.newsletter,
        });

        toast({
          title: "Changes saved",
          description: "Your profile has been updated.",
        });
      } catch (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to save changes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
    setActiveTab(newTab);
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
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Loading your profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={handleTabChange}
      className="space-y-6"
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="personal">Personal Info</TabsTrigger>
        <TabsTrigger value="constituency">Constituency</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <form>
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your basic profile information.
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
                    placeholder="Enter your name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>
              </div>

              {/* Gender & Age section */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users2 className="h-4 w-4" />
                    Gender
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
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
                          "h-auto py-3",
                          profile.gender === option.value && "border-primary"
                        )}
                        onClick={() => setProfile({ ...profile, gender: option.value })}
                      >
                        <span className="mr-2">{option.icon}</span>
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Cake className="h-4 w-4" />
                    Age Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "18-24", label: "18-24" },
                      { value: "25-34", label: "25-34" },
                      { value: "35-44", label: "35-44" },
                      { value: "45-54", label: "45-54" },
                      { value: "55-64", label: "55-64" },
                      { value: "65+", label: "65+" }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={profile.age === option.value ? "default" : "outline"}
                        className={cn(
                          "h-auto py-2",
                          profile.age === option.value && "border-primary"
                        )}
                        onClick={() => setProfile({ ...profile, age: option.value })}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constituency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                MP Details
              </CardTitle>
              <CardDescription>
                Your postcode connects you with your local MP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
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
                        postcodeError ? "border-destructive" : 
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
                      className="text-sm text-destructive flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
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
                      className="p-4 bg-muted rounded-lg border space-y-1"
                    >
                      <p className="font-medium">{profile.mp}</p>
                      <p className="text-sm text-muted-foreground">{profile.constituency}</p>
                    </motion.div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed h-[68px] flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Enter your postcode to find your MP</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add settings content here */}
            </CardContent>
          </Card>
        </TabsContent>
      </form>

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

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving changes...
        </div>
      )}

      {hasChanges && !isSaving && (
        <div className="fixed bottom-4 right-4 bg-muted px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="h-4 w-4" />
          Unsaved changes
        </div>
      )}
    </Tabs>
  );
} 