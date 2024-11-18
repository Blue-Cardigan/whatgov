'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { DebateList } from './DebateList';

export function DebateFeed() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useFeed({ pageSize: 8 });

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
    <div className="flex justify-center">
      <div className="w-full max-w-xl">
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