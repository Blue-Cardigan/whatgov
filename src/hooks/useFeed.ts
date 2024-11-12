import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedItems } from '@/lib/supabase';
import { useVotes } from './useVotes';

interface UseFeedOptions {
  votedOnly?: boolean;
}

export function useFeed({ votedOnly = false }: UseFeedOptions = {}) {
  return useInfiniteQuery({
    queryKey: ['feed', { votedOnly }],
    queryFn: ({ pageParam }) => getFeedItems(20, pageParam, votedOnly),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: false, // Don't refetch on mount to prevent debate movement
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
} 