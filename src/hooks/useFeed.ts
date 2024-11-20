import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedItems, type FeedCursor, FeedFilters } from '@/lib/supabase';
import { useCache } from './useCache';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface UseFeedOptions {
  votedOnly?: boolean;
  pageSize?: number;
  userTopics?: string[];
  filters?: FeedFilters;
}

export function useFeed({ 
  votedOnly = false, 
  pageSize = 8,
  userTopics = [],
  filters = {}
}: UseFeedOptions = {}) {
  const { getCache, setCache, CACHE_KEYS } = useCache();
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['feed', { votedOnly, pageSize, userTopics, filters, isAuthenticated: !!user }],
    queryFn: async ({ pageParam = null as FeedCursor | null }) => {
      const cacheKey = CACHE_KEYS.debates.key(
        `${votedOnly}:${pageSize}:${
          pageParam ? `${pageParam.id}:${pageParam.date}:${pageParam.score}` : 'initial'
        }:${!!user}:${userTopics.join(',')}:${JSON.stringify(filters)}`
      );
      
      const VERSION = "v2";
      const versionedKey = `${VERSION}:${cacheKey}`;
      
      try {
        const cached = await getCache<ReturnType<typeof getFeedItems>>(versionedKey);
        if (cached) {
          getFeedItems(pageSize, pageParam, votedOnly, filters)
            .then(fresh => {
              if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
                setCache(versionedKey, fresh, CACHE_KEYS.debates.ttl);
              }
            })
            .catch(console.error);
          return cached;
        }

        const data = await getFeedItems(pageSize, pageParam, votedOnly, filters);
        await setCache(versionedKey, data, CACHE_KEYS.debates.ttl);
        return data;
      } catch (error) {
        console.error('Cache error:', error);
        return getFeedItems(pageSize, pageParam, votedOnly, filters);
      }
    },
    getNextPageParam: (lastPage): FeedCursor | undefined => {
      // Don't return a next cursor if we got fewer items than requested
      if (!lastPage.items.length || lastPage.items.length < pageSize) {
        return undefined;
      }
      return lastPage.nextCursor;
    },
    select: (data) => {
      // Deduplicate items across pages
      const seenIds = new Set<string>();
      const deduplicatedPages = data.pages.map((page) => {
        const uniqueItems = page.items.filter(item => {
          if (seenIds.has(item.id)) {
            return false;
          }
          seenIds.add(item.id);
          return true;
        });

        return {
          ...page,
          items: uniqueItems,
        };
      });

      // Remove empty pages
      const nonEmptyPages = deduplicatedPages.filter(page => page.items.length > 0);

      return {
        pages: nonEmptyPages,
        pageParams: data.pageParams.slice(0, nonEmptyPages.length),
      };
    },
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Feed error:', error);
      toast({
        title: "Error loading debates",
        description: "Please try again later.",
      });
    },
  });
} 