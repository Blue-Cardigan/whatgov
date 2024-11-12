import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserVotes, submitVote } from '@/lib/supabase';
import { useCallback, useState } from 'react';
import { FeedItem } from '@/types';

export function useVotes() {
  const queryClient = useQueryClient();
  const [visibleDebateIds, setVisibleDebateIds] = useState<string[]>([]);

  const { data: votes = new Map() } = useQuery({
    queryKey: ['votes', visibleDebateIds],
    queryFn: () => getUserVotes(visibleDebateIds),
    staleTime: 1000 * 60 * 5,
    enabled: visibleDebateIds.length > 0,
  });

  const { mutate: submitVoteMutation } = useMutation({
    mutationFn: submitVote,
    onMutate: async ({ debateId, questionNumber, vote }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['votes', visibleDebateIds] });
      await queryClient.cancelQueries({ 
        queryKey: ['feed', { votedOnly: false }] 
      });

      // Snapshot the previous values
      const previousVotes = queryClient.getQueryData(['votes', visibleDebateIds]);
      const previousFeed = queryClient.getQueryData(['feed', { votedOnly: false }]);

      // Update votes optimistically
      const newVotes = new Map(votes);
      if (!newVotes.has(debateId)) {
        newVotes.set(debateId, new Map());
      }
      const debateVotes = newVotes.get(debateId)!;
      const previousVote = debateVotes.get(questionNumber);
      debateVotes.set(questionNumber, vote);
      
      queryClient.setQueryData(['votes', visibleDebateIds], newVotes);

      // Update feed counts optimistically
      queryClient.setQueriesData({ 
        queryKey: ['feed', { votedOnly: false }] 
      }, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: FeedItem) => {
              if (item.id !== debateId) return item;
              
              const ayesKey = `ai_question_${questionNumber}_ayes` as keyof FeedItem;
              const noesKey = `ai_question_${questionNumber}_noes` as keyof FeedItem;
              
              return {
                ...item,
                [ayesKey]: (item[ayesKey] as number || 0) + 
                  (vote ? 1 : 0) + 
                  (previousVote === true ? -1 : 0),
                [noesKey]: (item[noesKey] as number || 0) + 
                  (!vote ? 1 : 0) + 
                  (previousVote === false ? -1 : 0)
              };
            })
          }))
        };
      });

      return { previousVotes, previousFeed };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousVotes) {
        queryClient.setQueryData(['votes', visibleDebateIds], context.previousVotes);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed', { votedOnly: false }], context.previousFeed);
      }
    },
    onSettled: () => {
      // Only invalidate the votes query, not the feed
      queryClient.invalidateQueries({ queryKey: ['votes', visibleDebateIds] });
      // Don't invalidate the feed query to prevent unwanted refetches
      // queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const updateVisibleDebates = useCallback((debateIds: string[]) => {
    setVisibleDebateIds(debateIds);
  }, []);

  return {
    votes,
    submitVote: submitVoteMutation,
    updateVisibleDebates,
  };
} 