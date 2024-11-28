import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HansardAPI } from '@/lib/hansard-api';
import { useState, useMemo, useCallback } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { OralQuestion } from '@/lib/hansard-api';
import { CACHE_KEYS } from '@/lib/redis/config';
import { useCache } from './useCache';

// Helper function to check if data is empty or invalid
function isDataEmpty(data: OralQuestion[] | undefined): boolean {
  return !data || data.length === 0;
}

// Helper function to check if we should auto-switch to next week
function shouldAutoSwitchToNext(
  requestedWeek: 'current' | 'next',
  currentWeekQuery: UseQueryResult<OralQuestion[], unknown>,
  nextWeekQuery: UseQueryResult<OralQuestion[], unknown>,
  autoSwitchedToNext: boolean
): boolean {
  // Early return if basic conditions aren't met
  if (
    requestedWeek !== 'current' ||
    autoSwitchedToNext ||
    currentWeekQuery.isLoading ||
    nextWeekQuery.isLoading
  ) {
    return false;
  }

  // Check if current week has no data and next week has data
  const currentWeekEmpty = isDataEmpty(currentWeekQuery.data);
  const nextWeekHasData = !isDataEmpty(nextWeekQuery.data);

  return currentWeekEmpty && nextWeekHasData;
}

export function useDebatesData() {
  const [requestedWeek, setRequestedWeek] = useState<'current' | 'next'>('current');
  const [autoSwitchedToNext, setAutoSwitchedToNext] = useState(false);
  const queryClient = useQueryClient();
  const { getCache, setCache } = useCache();

  // Helper function to create cache key
  const getCacheKey = useCallback((week: 'current' | 'next') => 
    CACHE_KEYS.upcomingDebates.key(week), []);

  const currentWeekQuery = useQuery({
    queryKey: ['upcomingDebates', 'current'],
    queryFn: async () => {
      // Try to get from cache first
      const cacheKey = getCacheKey('current');
      const cached = await getCache<OralQuestion[]>(cacheKey);
      
      if (cached) {
        // Refresh cache in background
        HansardAPI.getUpcomingOralQuestions(false)
          .then(fresh => {
            if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
              setCache(cacheKey, fresh, CACHE_KEYS.upcomingDebates.ttl);
              queryClient.setQueryData(['upcomingDebates', 'current'], fresh);
            }
          })
          .catch(console.error);
        return cached;
      }

      // If not in cache, fetch fresh data
      const data = await HansardAPI.getUpcomingOralQuestions(false);
      await setCache(cacheKey, data, CACHE_KEYS.upcomingDebates.ttl);
      return data;
    },
    staleTime: CACHE_KEYS.upcomingDebates.ttl * 500, // Half the Redis TTL
    cacheTime: CACHE_KEYS.upcomingDebates.ttl * 1000,
    refetchOnWindowFocus: false,
  });

  const nextWeekQuery = useQuery({
    queryKey: ['upcomingDebates', 'next'],
    queryFn: async () => {
      const cacheKey = getCacheKey('next');
      const cached = await getCache<OralQuestion[]>(cacheKey);
      
      if (cached) {
        HansardAPI.getUpcomingOralQuestions(true)
          .then(fresh => {
            if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
              setCache(cacheKey, fresh, CACHE_KEYS.upcomingDebates.ttl);
              queryClient.setQueryData(['upcomingDebates', 'next'], fresh);
            }
          })
          .catch(console.error);
        return cached;
      }

      const data = await HansardAPI.getUpcomingOralQuestions(true);
      await setCache(cacheKey, data, CACHE_KEYS.upcomingDebates.ttl);
      return data;
    },
    staleTime: CACHE_KEYS.upcomingDebates.ttl * 500,
    cacheTime: CACHE_KEYS.upcomingDebates.ttl * 1000,
    refetchOnWindowFocus: false,
    enabled: requestedWeek === 'next' || currentWeekQuery.isSuccess,
  });

  const { data, isLoading, error, actualWeek } = useMemo(() => {
    if (shouldAutoSwitchToNext(requestedWeek, currentWeekQuery, nextWeekQuery, autoSwitchedToNext)) {
      setAutoSwitchedToNext(true);
      return {
        data: nextWeekQuery.data,
        isLoading: false,
        error: null,
        actualWeek: 'next'
      };
    }

    const query = requestedWeek === 'current' ? currentWeekQuery : nextWeekQuery;
    return {
      data: query.data,
      isLoading: query.isLoading,
      error: query.error,
      actualWeek: requestedWeek
    };
  }, [requestedWeek, currentWeekQuery, nextWeekQuery, autoSwitchedToNext]);

  const prefetchNextWeek = useCallback(() => {
    if (requestedWeek === 'current') {
      queryClient.prefetchQuery({
        queryKey: ['upcomingDebates', 'next'],
        queryFn: () => HansardAPI.getUpcomingOralQuestions(true),
        staleTime: CACHE_KEYS.upcomingDebates.ttl * 500,
      });
    }
  }, [queryClient, requestedWeek]);

  const toggleWeek = useCallback(() => {
    setAutoSwitchedToNext(false);
    setRequestedWeek(prev => prev === 'current' ? 'next' : 'current');
  }, []);

  return {
    data,
    isLoading,
    error,
    actualWeek,
    prefetchNextWeek,
    toggleWeek,
    queryClient,
    autoSwitchedToNext
  };
} 