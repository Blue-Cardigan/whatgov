'use client';

import { useRef, useEffect } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useVotes } from '@/hooks/useVotes';
import { DebateList } from './DebateList';

export function DebateHistory() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed({ 
    votedOnly: true 
  });
  const { updateVisibleDebates } = useVotes();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
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
    />
  );
} 