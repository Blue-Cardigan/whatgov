import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitVote } from '@/lib/supabase';
import { FeedItem } from '@/types';

interface QueryData {
  pages: Array<{
    items: FeedItem[];
  }>;
}

export function useVotes() {
  const queryClient = useQueryClient();

  const { mutate: submitVoteMutation } = useMutation({
    mutationFn: submitVote,
    onMutate: async ({ debate_id, question_number, vote }) => {
      await queryClient.cancelQueries({ 
        queryKey: ['feed', { votedOnly: false }] 
      });

      const previousFeed = queryClient.getQueryData(['feed', { votedOnly: false }]);

      // Check if already voted on this question
      const existingVotes = queryClient.getQueryData<Map<string, Map<number, boolean>>>(['votes']);
      const debateVotes = existingVotes?.get(debate_id);
      if (debateVotes?.has(question_number)) {
        // Already voted on this question, skip update
        return { previousFeed };
      }

      // Store the new vote
      queryClient.setQueryData(['votes'], (old: Map<string, Map<number, boolean>> | undefined) => {
        const newVotes = new Map(old || new Map());
        if (!newVotes.has(debate_id)) {
          newVotes.set(debate_id, new Map());
        }
        newVotes.get(debate_id)!.set(question_number, vote);
        return newVotes;
      });

      // Update feed counts optimistically
      queryClient.setQueriesData({ 
        queryKey: ['feed', { votedOnly: false }] 
      }, (old: QueryData | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== debate_id) return item;
              
              const ayesKey = `ai_question_${question_number}_ayes` as keyof FeedItem;
              const noesKey = `ai_question_${question_number}_noes` as keyof FeedItem;
              
              return {
                ...item,
                [ayesKey]: (item[ayesKey] as number || 0) + (vote ? 1 : 0),
                [noesKey]: (item[noesKey] as number || 0) + (!vote ? 1 : 0)
              };
            })
          }))
        };
      });

      return { previousFeed };
    },
    onError: (err, variables, context) => {
      // Revert optimistic updates on error
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed', { votedOnly: false }], context.previousFeed);
      }
      // Also revert the votes cache
      queryClient.setQueryData(['votes'], (old: Map<string, Map<number, boolean>> | undefined) => {
        const newVotes = new Map(old || new Map());
        const debateVotes = newVotes.get(variables.debate_id);
        if (debateVotes) {
          debateVotes.delete(variables.question_number);
        }
        return newVotes;
      });
    }
  });

  return {
    submitVote: submitVoteMutation
  };
} 