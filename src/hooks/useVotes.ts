import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitVote } from '@/lib/supabase';
import { FeedItem } from '@/types';
import { useAuth } from './useAuth';

const ANON_VOTES_KEY = 'whatgov_anon_votes';

interface QueryData {
  pages: Array<{
    items: FeedItem[];
  }>;
}

interface VoteData {
  debate_id: string;
  question_number: number;
  vote: boolean;
  timestamp: string;
}

export function useVotes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper functions for anonymous votes
  const getAnonVotes = (): VoteData[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(ANON_VOTES_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveAnonVote = (voteData: VoteData) => {
    if (typeof window === 'undefined') return;
    const votes = getAnonVotes();
    // Check if already voted on this question
    const exists = votes.some(v => 
      v.debate_id === voteData.debate_id && 
      v.question_number === voteData.question_number
    );
    if (!exists) {
      votes.push(voteData);
      localStorage.setItem(ANON_VOTES_KEY, JSON.stringify(votes));
    }
  };

  const hasVoted = (debate_id: string, question_number: number): boolean => {
    if (user) {
      // Check server-side votes cache
      const existingVotes = queryClient.getQueryData<Map<string, Map<number, boolean>>>(['votes']);
      return !!existingVotes?.get(debate_id)?.has(question_number);
    } else {
      // Check local storage votes
      const votes = getAnonVotes();
      return votes.some(v => 
        v.debate_id === debate_id && 
        v.question_number === question_number
      );
    }
  };

  const { mutate: submitVoteMutation } = useMutation({
    mutationFn: async (voteData: Parameters<typeof submitVote>[0]) => {
      if (user) {
        return submitVote(voteData);
      } else {
        // For anonymous users, just store locally
        const anonVoteData: VoteData = {
          ...voteData,
          timestamp: new Date().toISOString()
        };
        saveAnonVote(anonVoteData);
        return Promise.resolve();
      }
    },
    onMutate: async ({ debate_id, question_number, vote }) => {
      await queryClient.cancelQueries({ 
        queryKey: ['feed', { votedOnly: false }] 
      });

      const previousFeed = queryClient.getQueryData(['feed', { votedOnly: false }]);

      // Check if already voted
      if (hasVoted(debate_id, question_number)) {
        return { previousFeed };
      }

      // Store the vote in appropriate place
      if (user) {
        queryClient.setQueryData(['votes'], (old: Map<string, Map<number, boolean>> | undefined) => {
          const newVotes = new Map(old || new Map());
          if (!newVotes.has(debate_id)) {
            newVotes.set(debate_id, new Map());
          }
          newVotes.get(debate_id)!.set(question_number, vote);
          return newVotes;
        });
      }

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
      
      if (user) {
        // Revert the votes cache for authenticated users
        queryClient.setQueryData(['votes'], (old: Map<string, Map<number, boolean>> | undefined) => {
          const newVotes = new Map(old || new Map());
          const debateVotes = newVotes.get(variables.debate_id);
          if (debateVotes) {
            debateVotes.delete(variables.question_number);
          }
          return newVotes;
        });
      } else {
        // Remove from local storage for anonymous users
        const votes = getAnonVotes();
        const filteredVotes = votes.filter(v => 
          !(v.debate_id === variables.debate_id && 
            v.question_number === variables.question_number)
        );
        localStorage.setItem(ANON_VOTES_KEY, JSON.stringify(filteredVotes));
      }
    }
  });

  return {
    submitVote: submitVoteMutation,
    hasVoted
  };
} 