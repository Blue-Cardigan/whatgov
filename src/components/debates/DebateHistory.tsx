'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useVotes } from '@/hooks/useVotes';
import { DebateList } from './DebateList';

export function DebateHistory() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useFeed({ votedOnly: true });
  
  const { 
    votes, 
    updateVisibleDebates, 
    submitVote 
  } = useVotes();

  const handleVote = useCallback((
    debateId: string, 
    questionNumber: number, 
    vote: boolean
  ) => {
    submitVote({ debateId, questionNumber, vote });
  }, [submitVote]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { 
        root: null,
        threshold: 0,
        rootMargin: '250px 0px',
      }
    );

    const element = loadMoreRef.current;
    if (element) {
      observer.observe(element);
    }

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
      onVote={handleVote}
      readOnly
    />
  );
} 