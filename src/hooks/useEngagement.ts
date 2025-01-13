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
    RESEARCH_SEARCHES: 5,    // 5 research assistant searches per month
    HANSARD_AI: 5,          // 5 AI-assisted Hansard searches per month
    ASSISTANTS: 0           // 0 total
  },
  ENGAGED_CITIZEN: {
    RESEARCH_SEARCHES: 5,    // 5 research assistant searches per week
    HANSARD_AI: 5,          // 5 AI-assisted Hansard searches per week
    ASSISTANTS: 1           // 1 total
  },
  PROFESSIONAL: {
    RESEARCH_SEARCHES: Infinity, // Unlimited
    HANSARD_AI: Infinity,       // Unlimited
    ASSISTANTS: Infinity        // Unlimited
  }
} as const;

interface EngagementStats {
  votes: number;
  lastResetDate: string;
  shownPrompts: number[];
  researchSearches: number;      // Renamed from aiSearches
  hansardAISearches: number;     // New counter for Hansard AI searches
  aiSearchLastReset: string;
  assistantsCreated: number;
}

export function useEngagement() {
  const { user, profile, updateProfile, isEngagedCitizen, isProfessional } = useAuth();
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
      researchSearches: 0,
      hansardAISearches: 0,
      aiSearchLastReset: new Date().toISOString(),
      assistantsCreated: 0,
    };
  }

  function shouldReset(lastReset: Date): boolean {
    const now = new Date();
    const resetTime = new Date(lastReset);
    resetTime.setHours(RESET_HOUR, 0, 0, 0);
    resetTime.setDate(resetTime.getDate() + 1);
    return now >= resetTime;
  }

  const recordVote = useCallback(async () => {
    if (user?.id) {
      try {
        const supabase = createClient();
        const now = new Date();
        const resetTime = new Date(profile?.votes_last_reset || 0);
        resetTime.setHours(RESET_HOUR, 0, 0, 0);
        resetTime.setDate(resetTime.getDate() + 1);

        const shouldResetCount = now >= resetTime;
        
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            votes_count: shouldResetCount ? 1 : (profile?.votes_count || 0) + 1,
            votes_last_reset: shouldResetCount ? now.toISOString() : profile?.votes_last_reset
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;

        // Update local profile state through AuthContext
        await updateProfile(data);

      } catch (error) {
        console.error('Failed to record vote:', error);
        toast({
          title: "Error",
          description: "Failed to record vote. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    } else {
      // For anonymous users, use localStorage
      if (!shouldReset(new Date(stats.lastResetDate))) {
        setStats(prev => ({
          ...prev,
          votes: prev.votes + 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          votes: 1,
          lastResetDate: new Date().toISOString()
        }));
      }
    }
  }, [user?.id, profile, updateProfile, toast, stats.lastResetDate]);

  const getRemainingVotes = useCallback((): number => {
    if (user) return Infinity;
    
    // For anonymous users, use localStorage
    if (shouldReset(new Date(stats.lastResetDate))) {
      return ANON_LIMITS.DAILY_VOTES;
    }
    return Math.max(0, ANON_LIMITS.DAILY_VOTES - stats.votes);
  }, [user, stats.votes, stats.lastResetDate]);

  const hasReachedVoteLimit = useCallback((): boolean => {
    if (user) return false;
    return getRemainingVotes() <= 0;
  }, [user, getRemainingVotes]);

  // Add function to check if we should reset AI search count
  const shouldResetAISearches = useCallback((): boolean => {
    if (!profile?.ai_and_ai_hansard_searches_last_reset) return true;

    const now = new Date();
    const lastReset = new Date(profile.ai_and_ai_hansard_searches_last_reset);

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

  // Add separate functions for each type of AI search
  const recordResearchSearch = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ai_searches_count: shouldResetAISearches() ? 1 : (profile?.ai_searches_count || 0) + 1,
          ai_and_ai_hansard_searches_last_reset: shouldResetAISearches() ? now : profile?.ai_and_ai_hansard_searches_last_reset
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      await updateProfile(data);

    } catch (error) {
      console.error('Failed to record research search:', error);
      toast({
        title: "Error",
        description: "Failed to record search. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, profile, shouldResetAISearches, updateProfile, toast]);

  const recordHansardAISearch = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          hansard_ai_searches_count: shouldResetAISearches() ? 1 : (profile?.hansard_ai_searches_count || 0) + 1,
          ai_and_ai_hansard_searches_last_reset: shouldResetAISearches() ? now : profile?.ai_and_ai_hansard_searches_last_reset
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      await updateProfile(data);

    } catch (error) {
      console.error('Failed to record Hansard AI search:', error);
      toast({
        title: "Error",
        description: "Failed to record search. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, profile, shouldResetAISearches, updateProfile, toast]);

  // Add separate functions to get remaining searches for each type
  const getRemainingResearchSearches = useCallback((): number => {
    if (!user) return 0;
    if (isProfessional) return AI_LIMITS.PROFESSIONAL.RESEARCH_SEARCHES;
    
    const limit = isEngagedCitizen ? 
      AI_LIMITS.ENGAGED_CITIZEN.RESEARCH_SEARCHES : 
      AI_LIMITS.FREE.RESEARCH_SEARCHES;

    if (shouldResetAISearches()) {
      return limit;
    }

    return Math.max(0, limit - (profile?.ai_searches_count || 0));
  }, [user, isProfessional, isEngagedCitizen, profile, shouldResetAISearches]);

  const getRemainingHansardAISearches = useCallback((): number => {
    if (!user) return 0;
    if (isProfessional) return AI_LIMITS.PROFESSIONAL.HANSARD_AI;
    
    const limit = isEngagedCitizen ? 
      AI_LIMITS.ENGAGED_CITIZEN.HANSARD_AI : 
      AI_LIMITS.FREE.HANSARD_AI;

    if (shouldResetAISearches()) {
      return limit;
    }

    return Math.max(0, limit - (profile?.hansard_ai_searches_count || 0));
  }, [user, isProfessional, isEngagedCitizen, profile, shouldResetAISearches]);

  // Add separate functions to check limits for each type
  const hasReachedResearchSearchLimit = useCallback((): boolean => {
    if (!user) return true;
    if (isProfessional) return false;
    
    if (shouldResetAISearches()) {
      return false;
    }
    
    return getRemainingResearchSearches() <= 0;
  }, [user, isProfessional, getRemainingResearchSearches, shouldResetAISearches]);

  const hasReachedHansardAISearchLimit = useCallback((): boolean => {
    if (!user) return true;
    if (isProfessional) return false;
    
    if (shouldResetAISearches()) {
      return false;
    }
    
    return getRemainingHansardAISearches() <= 0;
  }, [user, isProfessional, getRemainingHansardAISearches, shouldResetAISearches]);

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
    if (isProfessional) return AI_LIMITS.PROFESSIONAL.ASSISTANTS;
    
    const limit = isEngagedCitizen ? 
      AI_LIMITS.ENGAGED_CITIZEN.ASSISTANTS : 
      AI_LIMITS.FREE.ASSISTANTS;
    
    return Math.max(0, limit - stats.assistantsCreated);
  }, [user, isProfessional, isEngagedCitizen, stats.assistantsCreated]);

  // Add function to check if user has reached assistant creation limit
  const hasReachedAssistantLimit = useCallback((): boolean => {
    if (!user) return true;
    if (isProfessional) return false;
    
    return getRemainingAssistants() <= 0;
  }, [user, isProfessional, getRemainingAssistants]);

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

  return {
    recordVote,
    getRemainingVotes,
    shouldShowVotePrompt,
    hasReachedVoteLimit,
    recordResearchSearch,
    recordHansardAISearch,
    getRemainingResearchSearches,
    getRemainingHansardAISearches,
    hasReachedResearchSearchLimit,
    hasReachedHansardAISearchLimit,
    recordAssistantCreation,
    getRemainingAssistants,
    hasReachedAssistantLimit,
  };
}