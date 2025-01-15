'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2, User } from "lucide-react";
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useRouter } from 'next/navigation';
import createClient from '@/lib/supabase/client';
import type { UserProfile } from '@/types/supabase';

export function ProfileSettings() {
  const { profile: originalProfile, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
            organization: profile.organization,
            role: profile.role,
          });
        } catch (error) {
          console.error('Error saving changes:', error);
        }
      }
    }, [hasChanges, profile, updateProfile])
  );

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    try {
      await updateProfile({
        organization: profile.organization,
        role: profile.role,
      });

      toast({
        title: "Changes saved",
        description: "Your profile has been updated.",
      });
      setHasChanges(false);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your profile information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization (optional)</Label>
              <Input
                id="organization"
                value={profile.organization || ''}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                placeholder="Where do you work?"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role (optional)</Label>
              <Input
                id="role"
                value={profile.role || ''}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                placeholder="What do you do?"
              />
            </div>
          </div>

          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
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
                  This will permanently delete your account and all your data. 
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

      {hasChanges && !isSaving && (
        <div className="fixed bottom-4 right-4 bg-muted px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="h-4 w-4" />
          Unsaved changes
        </div>
      )}
    </div>
  );
} 