'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile } from '@/lib/supabase';
import { Badge } from "@/components/ui/badge";
import { TOPICS } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProfileSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Fetch the user's profile data
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await createClient()
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        return;
      }

      setProfile({
        name: data.name || '',
        email: user.email || '',
        postcode: data.postcode || '',
        constituency: data.constituency || '',
        mp: data.mp || '',
        gender: data.gender || '',
        age: data.age || '',
        selected_topics: data.selected_topics || [],
      });
    }

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setIsLoading(true);
    
    try {
      const { error } = await createClient()
        .from('user_profiles')
        .update({
          name: profile.name,
          postcode: profile.postcode,
          constituency: profile.constituency,
          mp: profile.mp,
          gender: profile.gender,
          age: profile.age,
          selected_topics: profile.selected_topics,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update email if it has changed
      if (profile.email !== user.email) {
        const { error: emailError } = await createClient().auth.updateUser({
          email: profile.email
        });
        if (emailError) throw emailError;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
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
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile information and email settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={profile.postcode}
              onChange={(e) => setProfile({ ...profile, postcode: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="constituency">Constituency</Label>
            <Input
              id="constituency"
              value={profile.constituency}
              onChange={(e) => setProfile({ ...profile, constituency: e.target.value })}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mp">Member of Parliament</Label>
            <Input
              id="mp"
              value={profile.mp}
              onChange={(e) => setProfile({ ...profile, mp: e.target.value })}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={profile.gender}
              onValueChange={(value) => setProfile({ ...profile, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age Range</Label>
            <Select
              value={profile.age}
              onValueChange={(value) => setProfile({ ...profile, age: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under-18">Under 18</SelectItem>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55-64">55-64</SelectItem>
                <SelectItem value="65+">65+</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Topics of Interest</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TOPICS.map((topic) => {
                const isSelected = profile.selected_topics.includes(topic.id);
                const Icon = topic.icon;
                
                return (
                  <Badge
                    key={topic.id}
                    variant={isSelected ? "default" : "outline"}
                    className="w-full cursor-pointer transition-all py-4 px-4 flex items-center justify-between gap-3"
                    onClick={() => {
                      setProfile({
                        ...profile,
                        selected_topics: isSelected
                          ? profile.selected_topics.filter(t => t !== topic.id)
                          : [...profile.selected_topics, topic.id]
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium">{topic.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
} 