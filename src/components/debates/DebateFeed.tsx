'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useAuth } from '@/hooks/useAuth';
import { DebateList } from './DebateList';
import { TopBar } from '@/components/nav/TopBar';
import type { FeedFilters } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function DebateFeed() {
  const { profile, user, loading, isEngagedCitizen } = useAuth();
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>({
    house: [],
    location: [],
    type: [],
    days: [],
    topics: [],
    mpOnly: false,
    divisionsOnly: false
  });

  // Show welcome toast for unauthenticated users
  useEffect(() => {
    if (!loading && !user && !hasShownWelcome) {
      setHasShownWelcome(true);
      toast({
        description: (
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-bold">Parliament, in everyday language.</h1>
            <p className="text-muted-foreground">
              We summarise and paraphrase what MPs say using AI, so you can vote on what they say.
            </p>
            <p>
              Create a free account to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Vote on unlimited debates</li>
              <li>See how MPs voted in divisions</li>
              <li>Track your MP&apos;s activity</li>
            </ul>
          </div>
        ),
        duration: 8000,
      });
    }
  }, [loading, user, hasShownWelcome, toast]);

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useFeed({ 
    pageSize: 8,
    filters: {
      ...filters,
      type: filters.type.length ? filters.type : [],
      location: filters.location.length ? filters.location : [],
      days: filters.days.length ? filters.days : [],
      topics: filters.topics.length ? filters.topics : [],
    }
  });

  // Deduplicate items across pages
  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    
    const seenIds = new Set<string>();
    return data.pages.flatMap(page => 
      page.items.filter(item => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
    );
  }, [data?.pages]);

  useEffect(() => {
    // Move the entire IntersectionObserver logic inside this check
    if (typeof window === 'undefined') return;

    // Create observer only on the client side
    const createObserver = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { 
          root: null,
          threshold: 0.1,
          rootMargin: '2000px 0px',
        }
      );

      const element = loadMoreRef.current;
      if (element) {
        observer.observe(element);
      }
      return observer;
    };

    let timeoutId: NodeJS.Timeout;
    const observer = createObserver();

    // Define resize handler
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        observer.disconnect();
        createObserver();
      }, 100);
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="flex flex-col md:pr-20">
      <div className="mb-4">
        <TopBar 
          filters={filters}
          onChange={setFilters}
        />
      </div>
      <div className="container max-w-xl mx-auto px-4">
        <DebateList
          items={allItems}
          isLoading={isLoading}
          loadMoreRef={loadMoreRef}
          isFetchingNextPage={isFetchingNextPage}
          hasMore={hasNextPage}
          userMp={profile?.mp}
          isEngagedCitizen={isEngagedCitizen}
        />
      </div>
    </div>
  );
} 