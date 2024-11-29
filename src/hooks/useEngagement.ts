import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ANON_LIMITS, ENGAGEMENT_TRIGGERS } from '@/lib/utils';
import { isSubscriptionActive } from '@/lib/supabase/subscription';

const STORAGE_KEY = 'whatgov_engagement';
const RESET_HOUR = 0; // Reset at midnight UTC

// Add AI search limit to the constants
export const MONTHLY_AI_SEARCH_LIMIT = 12

interface EngagementStats {
  votes: number;
  lastResetDate: string;
  shownPrompts: number[];
  aiSearches: number;  // Add this field
  aiSearchLastReset: string;  // Add this field for monthly reset
}

export function useEngagement() {
  const { user, subscription } = useAuth();
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

  // Add function to check if we should reset monthly counters
  const shouldResetMonthly = useCallback((lastReset: Date): boolean => {
    const now = new Date();
    const resetTime = new Date(lastReset);
    return now.getMonth() !== resetTime.getMonth() || 
           now.getFullYear() !== resetTime.getFullYear();
  }, []);

  // Add function to check and reset monthly stats
  const checkAndResetMonthly = useCallback(() => {
    if (shouldResetMonthly(new Date(stats.aiSearchLastReset))) {
      setStats(prev => ({
        ...prev,
        aiSearches: 0,
        aiSearchLastReset: new Date().toISOString()
      }));
      return true;
    }
    return false;
  }, [stats.aiSearchLastReset, shouldResetMonthly]);

  // Add function to record AI search
  const recordAISearch = useCallback(() => {
    if (!checkAndResetMonthly()) {
      setStats(prev => ({
        ...prev,
        aiSearches: prev.aiSearches + 1
      }));
    }
  }, [checkAndResetMonthly]);

  // Add function to get remaining AI searches
  const getRemainingAISearches = useCallback((): number => {
    if (user?.id && isSubscriptionActive(subscription)) return Infinity;
    
    checkAndResetMonthly();
    return Math.max(0, MONTHLY_AI_SEARCH_LIMIT - stats.aiSearches);
  }, [user, stats.aiSearches, checkAndResetMonthly, subscription]);

  // Add function to check if user has reached AI search limit
  const hasReachedAISearchLimit = useCallback((): boolean => {
    if (user?.id && isSubscriptionActive(subscription)) return false;
    
    return getRemainingAISearches() <= 0;
  }, [user, getRemainingAISearches, subscription]);

  return {
    recordVote,
    getRemainingVotes,
    shouldShowVotePrompt,
    hasReachedVoteLimit,
    recordAISearch,
    getRemainingAISearches,
    hasReachedAISearchLimit,
  };
}