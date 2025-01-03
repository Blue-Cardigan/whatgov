import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { CACHE_KEYS } from '@/lib/redis/config';
import { CalendarApi } from '@/lib/calendar-api';
import type { HansardData } from '@/types/calendar';

export function useQuestionsData() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { 
    data, 
    isLoading, 
    error, 
    isFetching
  } = useQuery<HansardData>({
    queryKey: ['monthlyDebates', format(currentDate, 'yyyy-MM')],
    queryFn: () => CalendarApi.getMonthlyEvents(currentDate),
    staleTime: CACHE_KEYS.upcomingDebates.ttl * 500,
    cacheTime: CACHE_KEYS.upcomingDebates.ttl * 1000,
    refetchOnWindowFocus: false,
  });

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(date => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(date => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }, []);

  return {
    data,
    isLoading,
    isFetching,
    error,
    currentDate,
    setCurrentDate,
    goToPreviousMonth,
    goToNextMonth
  };
} 