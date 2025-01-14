import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import createClient from '@/lib/supabase/client';

const STORAGE_KEY = 'whatgov_engagement';
const RESET_HOUR = 0; // Reset at midnight UTC

// AI search limits per tier
const AI_LIMITS = {
  FREE: {
    AI_SEARCHES: 3,     // 3 research assistant searches per day
  },
  PROFESSIONAL: {
    AI_SEARCHES: Infinity, // Unlimited
  }
} as const;

interface EngagementStats {
  lastResetDate: string;
  shownPrompts: number[];
  aiSearches: number;
  aiSearchLastReset: string;
}

interface UserProfile {
  ai_searches_count?: number;
  ai_searches_last_reset?: string;
}

interface User {
  id: string;
}

export function useEngagement() {
  const { user, profile, updateProfile, isProfessional } = useAuth() as {
    user: User | null;
    profile: UserProfile | null;
    updateProfile: (data: UserProfile) => Promise<void>;
    isProfessional: boolean;
  };
  const { toast } = useToast();

  const [stats] = useState<EngagementStats>(() => {
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
      lastResetDate: new Date().toISOString(),
      shownPrompts: [],
      aiSearches: 0,
      aiSearchLastReset: new Date().toISOString(),
    };
  }

  function shouldReset(lastReset: Date): boolean {
    const now = new Date();
    const resetTime = new Date(lastReset);
    resetTime.setHours(RESET_HOUR, 0, 0, 0);
    resetTime.setDate(resetTime.getDate() + 1);
    return now >= resetTime;
  }

  // Add function to check if we should reset AI search count
  const shouldResetAISearches = useCallback((): boolean => {
    if (!profile?.ai_searches_last_reset) return true;

    const now = new Date();
    const lastReset = new Date(profile.ai_searches_last_reset);
    
    // Reset daily at midnight UTC
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    return lastReset < dayStart;
  }, [profile]);

  // Update recordAISearch to handle resets
  const recordAISearch = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          // Reset count to 1 if should reset, otherwise increment
          ai_searches_count: shouldResetAISearches() ? 1 : (profile?.ai_searches_count || 0) + 1,
          // Update last reset time only if resetting
          ai_searches_last_reset: shouldResetAISearches() ? now : profile?.ai_searches_last_reset
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
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

  // Update getRemainingAISearches to handle resets
  const getRemainingAISearches = useCallback((): number => {
    if (!user) return 0;
    if (isProfessional) return AI_LIMITS.PROFESSIONAL.AI_SEARCHES;
    
    const limit = AI_LIMITS.FREE.AI_SEARCHES;

    if (shouldResetAISearches()) {
      return limit;
    }

    return Math.max(0, limit - (profile?.ai_searches_count || 0));
  }, [user, isProfessional, profile, shouldResetAISearches]);

  // Update hasReachedAISearchLimit to handle resets
  const hasReachedAISearchLimit = useCallback((): boolean => {
    if (!user) return true;
    if (isProfessional) return false;
    
    if (shouldResetAISearches()) {
      return false;
    }
    
    return getRemainingAISearches() <= 0;
  }, [user, isProfessional, getRemainingAISearches, shouldResetAISearches]);

  return {
    recordAISearch,
    getRemainingAISearches,
    hasReachedAISearchLimit,
  };
}