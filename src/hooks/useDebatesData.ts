import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HansardAPI } from '@/lib/hansard-api';
import { useState, useMemo, useCallback } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { OralQuestion } from '@/lib/hansard-api';
import { CACHE_KEYS } from '@/lib/redis/config';

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

  // Always fetch both weeks in parallel
  const currentWeekQuery = useQuery({
    queryKey: ['upcomingDebates', 'current'],
    queryFn: () => HansardAPI.getUpcomingOralQuestions(false),
    staleTime: CACHE_KEYS.upcomingDebates.ttl * 1000,
    cacheTime: CACHE_KEYS.upcomingDebates.ttl * 1000 * 2,
    refetchOnWindowFocus: false,
  });

  const nextWeekQuery = useQuery({
    queryKey: ['upcomingDebates', 'next'],
    queryFn: () => HansardAPI.getUpcomingOralQuestions(true),
    staleTime: CACHE_KEYS.upcomingDebates.ttl * 1000,
    cacheTime: CACHE_KEYS.upcomingDebates.ttl * 1000 * 2,
    refetchOnWindowFocus: false,
    // Enable next week query only when needed
    enabled: requestedWeek === 'next' || isDataEmpty(currentWeekQuery.data),
  });

  const { data, isLoading, error, actualWeek } = useMemo(() => {
    // Check if we should auto-switch to next week
    if (shouldAutoSwitchToNext(requestedWeek, currentWeekQuery, nextWeekQuery, autoSwitchedToNext)) {
      setAutoSwitchedToNext(true);
      return {
        data: nextWeekQuery.data,
        isLoading: false,
        error: null,
        actualWeek: 'next'
      };
    }

    // Use the requested week's data
    const query = requestedWeek === 'current' ? currentWeekQuery : nextWeekQuery;
    
    // Show loading state only when the requested data is loading
    const isQueryLoading = query.isLoading || 
      (requestedWeek === 'next' && nextWeekQuery.isInitialLoading);

    return {
      data: query.data,
      isLoading: isQueryLoading,
      error: query.error,
      actualWeek: requestedWeek
    };
  }, [requestedWeek, currentWeekQuery, nextWeekQuery, autoSwitchedToNext]);

  // Prefetch next week's data when hovering over the toggle button
  const prefetchNextWeek = useCallback(() => {
    if (requestedWeek === 'current' && !nextWeekQuery.data) {
      queryClient.prefetchQuery({
        queryKey: ['upcomingDebates', 'next'],
        queryFn: () => HansardAPI.getUpcomingOralQuestions(true),
        staleTime: CACHE_KEYS.upcomingDebates.ttl * 1000,
      });
    }
  }, [queryClient, requestedWeek, nextWeekQuery.data]);

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