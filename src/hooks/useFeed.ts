import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedItems } from '@/lib/supabase';
import { useCache } from './useCache';
import { toast } from 'react-hot-toast';

interface UseFeedOptions {
  votedOnly?: boolean;
  pageSize?: number;
  userTopics?: string[];
}

export function useFeed({ 
  votedOnly = false, 
  pageSize = 8,
  userTopics = [] 
}: UseFeedOptions = {}) {
  const { getCache, setCache, CACHE_KEYS } = useCache();

  return useInfiniteQuery({
    queryKey: ['feed', { votedOnly, pageSize, userTopics }],
    queryFn: async ({ pageParam = null }) => {
      const cacheKey = CACHE_KEYS.debates.key(`${votedOnly}:${pageSize}:${pageParam || 'initial'}`);
      
      const VERSION = "v1";
      const versionedKey = `${VERSION}:${cacheKey}`;
      
      const cached = await getCache<ReturnType<typeof getFeedItems>>(versionedKey);
      if (cached) {
        getFeedItems(pageSize, pageParam, votedOnly, userTopics)
          .then(fresh => setCache(versionedKey, fresh, CACHE_KEYS.debates.ttl))
          .catch(console.error);
        return cached;
      }

      const data = await getFeedItems(pageSize, pageParam, votedOnly, userTopics);
      await setCache(cacheKey, data, CACHE_KEYS.debates.ttl);
      
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Feed error:', error);
      toast.error("Error loading debates");
    },
  });
} 