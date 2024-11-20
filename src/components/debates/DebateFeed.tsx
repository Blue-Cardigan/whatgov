'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { DebateList } from './DebateList';
import { TopBar } from '@/components/nav/TopBar';

interface Filters {
  type: string[];
  location: string[];
  days: string[];
  topics: string[];
  mpOnly: boolean;
}

export function DebateFeed() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<Filters>({
    type: [],
    location: [],
    days: [],
    topics: [],
    mpOnly: false
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
      type: filters.type.length ? filters.type : undefined,
      location: filters.location.length ? filters.location : undefined,
      days: filters.days.length ? filters.days : undefined,
      topics: filters.topics.length ? filters.topics : undefined,
      mpOnly: filters.mpOnly
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
    let timeoutId: NodeJS.Timeout;
    
    // Create intersection observer with more aggressive loading
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { 
        root: null,
        threshold: 0.1, // Start loading when even 10% of the target is visible
        rootMargin: '2000px 0px', // Increased from 1000px to 2000px (about 4-6 screens ahead)
      }
    );

    // Define resize handler
    const handleResize = (element: Element) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        observer.unobserve(element);
        observer.observe(element);
      }, 100);
    };

    // Start observing
    const element = loadMoreRef.current;
    if (element) {
      observer.observe(element);
      window.addEventListener('resize', () => handleResize(element));
    }

    // Cleanup
    return () => {
      if (element) {
        observer.unobserve(element);
        window.removeEventListener('resize', () => handleResize(element));
      }
      observer.disconnect();
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
        />
      </div>
    </div>
  );
} 