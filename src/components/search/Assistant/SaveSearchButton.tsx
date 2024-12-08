'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, BookmarkCheck, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SaveSearchButtonProps {
  query: string;
  response: string;
  citations: string[];
  className?: string;
}

export function SaveSearchButton({ 
  query, 
  response, 
  citations,
  className 
}: SaveSearchButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const supabase = useSupabase();
  const { user, isEngagedCitizen, isPremium } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const canSaveSearches = isEngagedCitizen || isPremium;

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save searches",
        variant: "destructive",
      });
      return;
    }

    if (!canSaveSearches) {
      toast({
        title: "Feature not available",
        description: "Upgrade to Engaged Citizen to save searches",
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/pricing')}
          >
            Upgrade
          </Button>
        ),
      });
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase.from('ai_searches').insert({
        user_id: user.id,
        query,
        response,
        citations,
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Search saved",
        description: "You can find this in your search history",
      });
    } catch (error) {
      console.error('Failed to save search:', error);
      toast({
        title: "Failed to save",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <Button 
        variant="outline" 
        className={className}
        disabled
      >
        <BookmarkCheck className="h-4 w-4 mr-2" />
        Saved
      </Button>
    );
  }

  if (!canSaveSearches) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={handleSave}
      >
        <Lock className="h-4 w-4 mr-2" />
        Upgrade to Save
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className={className}
      onClick={handleSave}
      disabled={isSaving}
    >
      <Bookmark className="h-4 w-4 mr-2" />
      {isSaving ? 'Saving...' : 'Save Search'}
    </Button>
  );
} 