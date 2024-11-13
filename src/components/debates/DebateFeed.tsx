'use client';

import { useRef, useEffect } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useVotes } from '@/hooks/useVotes';
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
  const { updateVisibleDebates, votes } = useVotes();

  useEffect(() => {
    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { 
        root: null, // Use viewport as root
        threshold: 0, // Trigger as soon as even 1px is visible
        rootMargin: '250px 0px', // Load more content 250px before reaching the end
      }
    );

    // Start observing
    const element = loadMoreRef.current;
    if (element) {
      observer.observe(element);
    }

    // Cleanup
    return () => {
      if (element) {
        observer.unobserve(element);
      }
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    if (data?.pages) {
      const debateIds = data.pages.flatMap(page => page.items.map(debate => debate.id));
      updateVisibleDebates(debateIds);
    }
  }, [data?.pages, updateVisibleDebates]);

  const allItems = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <DebateList
      items={allItems}
      isLoading={isLoading}
      loadMoreRef={loadMoreRef}
      isFetchingNextPage={isFetchingNextPage}
      votes={votes}
    />
  );
} 