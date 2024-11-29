import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedItems, type FeedCursor } from '@/lib/supabase/feed';
import { FeedFilters, FeedItem } from '@/types';
import { useCache } from './useCache';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useCallback } from 'react';

interface UseFeedOptions {
  votedOnly?: boolean;
  pageSize?: number;
  userTopics?: string[];
  filters?: FeedFilters;
}

interface VirtualizedFeedState {
  measurements: Map<string, {
    compact: number;
    expanded: number;
    current: number;
  }>;
  expandedStates: Map<string, boolean>;
}

export function useFeed({ 
  votedOnly = false, 
  pageSize = 8,
  userTopics = [],
  filters = {} as FeedFilters
}: UseFeedOptions = {}) {
  const { getCache, setCache, CACHE_KEYS } = useCache();
  const { user, isEngagedCitizen } = useAuth();

  // Create sanitized filters - ignore all filters for unauthenticated users
  const sanitizedFilters: FeedFilters = user ? {
    ...filters,
    // Ensure filters are off for non-subscribers
    location: isEngagedCitizen ? filters.location : [],
    type: isEngagedCitizen ? filters.type : [],
    days: isEngagedCitizen ? filters.days : [],
    topics: isEngagedCitizen ? filters.topics : [],
  } : {
    house: [],
    location: [],
    type: [],
    days: [],
    topics: [],
    mpOnly: false,
    divisionsOnly: false
  };

  return useInfiniteQuery({
    queryKey: ['feed', { votedOnly, pageSize, userTopics, filters: sanitizedFilters, isAuthenticated: !!user }],
    queryFn: async ({ pageParam = null as FeedCursor | null }) => {
      const cacheKey = CACHE_KEYS.debates.key(
        `${votedOnly}:${pageSize}:${
          pageParam ? `${pageParam.id}:${pageParam.date}:${pageParam.score}` : 'initial'
        }:${!!user}:${userTopics.join(',')}:${JSON.stringify(sanitizedFilters)}`
      );
      
      const VERSION = "v2";
      const versionedKey = `${VERSION}:${cacheKey}`;
      
      try {
        const cached = await getCache<ReturnType<typeof getFeedItems>>(versionedKey);
        if (cached) {
          getFeedItems(pageSize, pageParam, votedOnly, sanitizedFilters as FeedFilters)
            .then(fresh => {
              if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
                setCache(versionedKey, fresh, CACHE_KEYS.debates.ttl);
              }
            })
            .catch(console.error);
          return cached;
        }

        const data = await getFeedItems(pageSize, pageParam, votedOnly, sanitizedFilters as FeedFilters);
        await setCache(versionedKey, data, CACHE_KEYS.debates.ttl);
        return data;
      } catch (error) {
        console.error('Cache error:', error);
        return getFeedItems(pageSize, pageParam, votedOnly, sanitizedFilters as FeedFilters);
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

export function useVirtualizedFeed(items: FeedItem[]) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Consolidated state management
  const feedState = useRef<VirtualizedFeedState>({
    measurements: new Map(),
    expandedStates: new Map()
  });

  const estimateSize = useCallback((index: number) => {
    const item = items[index];
    if (!item) return 300; // Default height
    
    const measurement = feedState.current.measurements.get(item.id);
    if (measurement) {
      return measurement.current;
    }

    // Base height calculation
    const baseHeight = 150;
    const questionsHeight = [
      item.ai_question,
    ].filter(Boolean).length * 100;
    
    const divisionsHeight = item.divisions?.length ? 200 : 0;
    
    return baseHeight + questionsHeight + divisionsHeight;
  }, [items]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 3,
    measureElement: useCallback((element: HTMLElement) => {
      const height = element.getBoundingClientRect().height;
      const debateId = element.getAttribute('data-debate-id');
      
      if (debateId) {
        const isExpanded = feedState.current.expandedStates.get(debateId);
        const measurement = feedState.current.measurements.get(debateId) || {
          compact: height,
          expanded: height,
          current: height
        };

        if (isExpanded) {
          measurement.expanded = height;
        } else {
          measurement.compact = height;
        }
        measurement.current = height;
        
        feedState.current.measurements.set(debateId, measurement);
      }
      
      return height;
    }, [])
  });

  // Expose a clean API for state updates
  const updateItemState = useCallback((itemId: string, isExpanded: boolean) => {
    feedState.current.expandedStates.set(itemId, isExpanded);
    
    const measurement = feedState.current.measurements.get(itemId);
    if (measurement) {
      measurement.current = isExpanded ? measurement.expanded : measurement.compact;
      virtualizer.measure();
    }
  }, [virtualizer]);

  return {
    virtualizer,
    parentRef,
    updateItemState
  };
} 