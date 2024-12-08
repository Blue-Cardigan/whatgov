'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useAuth } from '@/contexts/AuthContext';
import { DebateList } from './DebateList';
import { TopBar } from '@/components/nav/TopBar';
import type { FeedFilters } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SimpleFooter } from '@/components/layout/SimpleFooter';
import { DebateSkeleton } from './DebateSkeleton';

export function DebateFeed() {
  const { isEngagedCitizen, loading, profile, user } = useAuth();
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>({
    house: [],
    type: [],
    days: [],
    topics: [],
    mpOnly: false,
    divisionsOnly: false
  });

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
      days: filters.days.length ? filters.days : [],
      topics: filters.topics.length ? filters.topics : [],
    }
  });

  useEffect(() => {
    if (!loading && !user && !hasShownWelcome) {
      const lastShown = localStorage.getItem('welcomeToastLastShown');
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        setHasShownWelcome(true);
        localStorage.setItem('welcomeToastLastShown', today);
        
        toast({
          description: (
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-bold">Parliament, in everyday language.</h1>
              <p className="text-muted-foreground">
                We paraphrase what MPs say using AI, so you can finally keep up with Parliament.
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
    }
  }, [loading, user, hasShownWelcome, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        observer.disconnect();
        createObserver();
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col md:pr-20">
        <div className="container max-w-xl mx-auto px-4 flex-1">
          <DebateSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:pr-20">
      <div className="container max-w-xl mx-auto px-4 flex-1">
        <TopBar 
          filters={filters}
          onChange={setFilters}
        />
        <DebateList
          items={allItems}
          loadMoreRef={loadMoreRef}
          isFetchingNextPage={isFetchingNextPage}
          hasMore={hasNextPage}
          userMp={profile?.mp}
          isEngagedCitizen={isEngagedCitizen}
          isLoading={isLoading}
        />
      </div>
      <SimpleFooter />
    </div>
  );
} 