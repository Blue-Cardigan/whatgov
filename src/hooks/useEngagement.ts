import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { FREE_LIMITS, ENGAGEMENT_TRIGGERS } from '@/lib/utils';

const STORAGE_KEY = 'whatgov_engagement';
const RESET_HOUR = 0; // Reset at midnight UTC

interface EngagementStats {
  votes: number;
  lastResetDate: string;
  shownPrompts: number[];
}

export function useEngagement() {
  const { user, isEngagedCitizen } = useAuth();
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
    return Math.max(0, FREE_LIMITS.DAILY_VOTES - stats.votes);
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

  return {
    recordVote,
    getRemainingVotes,
    shouldShowVotePrompt,
    hasReachedVoteLimit,
  };
}