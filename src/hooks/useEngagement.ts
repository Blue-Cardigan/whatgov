import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ANON_LIMITS, ENGAGEMENT_TRIGGERS } from '@/lib/utils';
import { startOfWeek, startOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import createClient from '@/lib/supabase/client';

const STORAGE_KEY = 'whatgov_engagement';
const RESET_HOUR = 0; // Reset at midnight UTC

// AI search limits per tier
const AI_LIMITS = {
  FREE: {
    SEARCHES: 5,        // 5 per month
    ASSISTANTS: 0       // 0 total
  },
  ENGAGED: {
    SEARCHES: 5,        // 5 per week
    ASSISTANTS: 1       // 1 total
  },
  PRO: {
    SEARCHES: Infinity, // Unlimited
    ASSISTANTS: Infinity // Unlimited
  }
} as const;

interface EngagementStats {
  votes: number;
  lastResetDate: string;
  shownPrompts: number[];
  aiSearches: number;
  aiSearchLastReset: string;
  assistantsCreated: number;
}

export function useEngagement() {
  const { user, profile, updateProfile, isEngagedCitizen, isPremium } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<EngagementStats>(() => {
    if (typeof window === 'undefined') return initializeStats();
    
    // Initialize from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if we need to reset based on date
      if (shouldReset(new Date(parsed.lastResetDate))) {
        return initializeStats();
      }
      return {
        ...parsed,
        shownPrompts: parsed.shownPrompts || []
      };
    }
    return initializeStats();
  });

  // Save to localStorage whenever stats change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  function initializeStats(): EngagementStats {
    return {
      votes: 0,
      lastResetDate: new Date().toISOString(),
      shownPrompts: [],
      aiSearches: 0,
      aiSearchLastReset: new Date().toISOString(),
      assistantsCreated: 0,
    };
  }

  function shouldReset(lastReset: Date): boolean {
    const now = new Date();
    const resetTime = new Date(lastReset);
    resetTime.setHours(RESET_HOUR, 0, 0, 0);
    resetTime.setDate(resetTime.getDate() + 1); // Set to next day
    return now >= resetTime;
  }

  const checkAndResetDaily = useCallback(() => {
    if (shouldReset(new Date(stats.lastResetDate))) {
      setStats(initializeStats());
      return true;
    }
    return false;
  }, [stats.lastResetDate]);

  const recordVote = useCallback(() => {
    if (!checkAndResetDaily()) {
      setStats(prev => ({
        ...prev,
        votes: prev.votes + 1
      }));
    }
  }, [checkAndResetDaily]);

  const getRemainingVotes = useCallback((): number => {
    if (user) return Infinity;
    
    checkAndResetDaily();
    return Math.max(0, ANON_LIMITS.DAILY_VOTES - stats.votes);
  }, [user, stats.votes, checkAndResetDaily]);

  const shouldShowVotePrompt = useCallback((): boolean => {
    if (user) return false;
    const remaining = getRemainingVotes();
    
    // Only show if we haven't shown this prompt before
    const shouldShow = ENGAGEMENT_TRIGGERS.VOTES_REMAINING.includes(remaining) && 
      !stats.shownPrompts.includes(remaining);
    
    // If we should show, record that we've shown it
    if (shouldShow) {
      setStats(prev => ({
        ...prev,
        shownPrompts: [...prev.shownPrompts, remaining]
      }));
    }
    
    return shouldShow;
  }, [user, getRemainingVotes, stats.shownPrompts]);

  const hasReachedVoteLimit = useCallback((): boolean => {
    if (user) return false;
    
    return getRemainingVotes() <= 0;
  }, [user, getRemainingVotes]);

  // Add function to check if we should reset AI search count
  const shouldResetAISearches = useCallback((): boolean => {
    if (!profile?.ai_searches_last_reset) return true;

    const now = new Date();
    const lastReset = new Date(profile.ai_searches_last_reset);

    if (isEngagedCitizen) {
      // Weekly reset for Engaged Citizen tier
      const weekStart = startOfWeek(now);
      return lastReset < weekStart;
    } else {
      // Monthly reset for free tier
      const monthStart = startOfMonth(now);
      return lastReset < monthStart;
    }
  }, [profile, isEngagedCitizen]);

  // Simplified AI search recording
  const recordAISearch = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ai_searches_count: shouldResetAISearches() ? 1 : (profile?.ai_searches_count || 0) + 1,
          ai_searches_last_reset: shouldResetAISearches() ? now : profile?.ai_searches_last_reset
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local profile state through AuthContext
      await updateProfile(data);

    } catch (error) {
      console.error('Failed to record AI search:', error);
      toast({
        title: "Error",
        description: "Failed to record search. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, profile, shouldResetAISearches, updateProfile, toast]);

  // Simplified remaining searches check
  const getRemainingAISearches = useCallback((): number => {
    if (!user) return 0;
    if (isPremium) return AI_LIMITS.PRO.SEARCHES;
    
    const limit = isEngagedCitizen ? 
      AI_LIMITS.ENGAGED.SEARCHES : 
      AI_LIMITS.FREE.SEARCHES;

    // If we need to reset, return full limit
    if (shouldResetAISearches()) {
      return limit;
    }

    return Math.max(0, limit - (profile?.ai_searches_count || 0));
  }, [user, isPremium, isEngagedCitizen, profile, shouldResetAISearches]);

  // Add function to check if user has reached AI search limit
  const hasReachedAISearchLimit = useCallback((): boolean => {
    if (!user) return true;
    if (isPremium) return false;
    
    if (shouldResetAISearches()) {
      return false;
    }
    
    return getRemainingAISearches() <= 0;
  }, [user, isPremium, getRemainingAISearches, shouldResetAISearches]);

  // Add function to record assistant creation
  const recordAssistantCreation = useCallback(() => {
    setStats(prev => ({
      ...prev,
      assistantsCreated: prev.assistantsCreated + 1
    }));
  }, []);

  // Add function to get remaining assistant creations
  const getRemainingAssistants = useCallback((): number => {
    if (!user) return 0;
    if (isPremium) return AI_LIMITS.PRO.ASSISTANTS;
    
    const limit = isEngagedCitizen ? 
      AI_LIMITS.ENGAGED.ASSISTANTS : 
      AI_LIMITS.FREE.ASSISTANTS;
    
    return Math.max(0, limit - stats.assistantsCreated);
  }, [user, isPremium, isEngagedCitizen, stats.assistantsCreated]);

  // Add function to check if user has reached assistant creation limit
  const hasReachedAssistantLimit = useCallback((): boolean => {
    if (!user) return true;
    if (isPremium) return false;
    
    return getRemainingAssistants() <= 0;
  }, [user, isPremium, getRemainingAssistants]);

  return {
    recordVote,
    getRemainingVotes,
    shouldShowVotePrompt,
    hasReachedVoteLimit,
    recordAISearch,
    getRemainingAISearches,
    hasReachedAISearchLimit,
    recordAssistantCreation,
    getRemainingAssistants,
    hasReachedAssistantLimit,
  };
}