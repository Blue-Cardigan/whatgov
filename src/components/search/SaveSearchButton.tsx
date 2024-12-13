'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, BookmarkCheck, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SearchResponse, SearchParams } from '@/types/search';
import { Citation } from '@/types/search';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SaveSearchButtonProps {
  results?: SearchResponse | null;
  searchParams?: SearchParams;
  aiSearch?: {
    query: string;
    streamingText: string;
    citations: Citation[];
  };
  searchType: 'ai' | 'hansard';
  className?: string;
}

export function SaveSearchButton({ 
  results,
  searchParams,
  aiSearch,
  searchType,
  className 
}: SaveSearchButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSchedulePopover, setShowSchedulePopover] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay();
    // If current day is weekend (0 or 6), default to Monday (1)
    return today === 0 || today === 6 ? 1 : today;
  });
  const [savedSearchId, setSavedSearchId] = useState<number | null>(null);
  const supabase = useSupabase();
  const { user, isEngagedCitizen, isPremium } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const canSaveSearches = isEngagedCitizen || isPremium;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const handleSaveSchedule = async () => {
    try {
      const { error } = await supabase
        .from('saved_search_schedules')
        .insert({
          search_id: savedSearchId, // You'll need to store this when saving the initial search
          user_id: user!.id,
          repeat_on: {
            frequency: 'weekly',
            dayOfWeek: selectedDay
          }
        });

      if (error) throw error;

      toast({
        title: "Schedule saved",
        description: `Search will repeat every ${dayNames[selectedDay]}`,
      });
      setShowSchedulePopover(false);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      toast({
        title: "Failed to save schedule",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

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

      const saveData = {
        user_id: user.id,
        search_type: searchType,
        ...(searchType === 'ai' 
          ? {
              query: aiSearch?.query || '',
              response: aiSearch?.streamingText || '',
              citations: aiSearch?.citations.map(c => JSON.stringify({
                citation_index: c.citation_index,
                debate_id: c.debate_id,
                chunk_text: c.chunk_text
              })) || [],
              query_state: null
            }
          : {
              query: searchParams?.searchTerm || '',
              response: JSON.stringify(results || {}),
              citations: [],
              query_state: {
                parts: searchParams?.searchTerm ? [searchParams.searchTerm] : [],
                startDate: searchParams?.startDate,
                endDate: searchParams?.endDate,
                house: searchParams?.house || 'Commons',
                enableAI: searchParams?.enableAI
              }
            }
        )
      };

      const { data, error } = await supabase
        .from('saved_searches')
        .insert(saveData)
        .select('id')
        .single();

      if (error) throw error;

      setIsSaved(true);
      setSavedSearchId(data.id);

      toast({
        title: "Search saved",
        description: "You can find this in your search history",
      });

      if (isEngagedCitizen) {
        setShowSchedulePopover(true);
      }
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
      <Popover open={showSchedulePopover} onOpenChange={setShowSchedulePopover}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={className}
          >
            <BookmarkCheck className="h-4 w-4 mr-2" />
            Saved
          </Button>
        </PopoverTrigger>
        {isEngagedCitizen && (
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Schedule Recurring Search</h4>
              <p className="text-sm text-muted-foreground">
                Choose which weekday to repeat this search
              </p>
              <Select
                value={selectedDay.toString()}
                onValueChange={(value) => setSelectedDay(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select weekday" />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSchedulePopover(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveSchedule}>
                  Save Schedule
                </Button>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
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