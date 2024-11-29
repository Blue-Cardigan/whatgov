import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { submitVote, getTopicVoteStats, getUserTopicVotes, getDemographicVoteStats, migrateAnonymousVotes } from '@/lib/supabase';
import { FeedItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  TopicStats, 
  UserTopicStats, 
  DemographicStats, 
  VoteData,
  TopicStatsEntry,
  UserTopicStatsEntry,
  RawTopicStats,
  RawUserVotingStats,
  UseVotesReturn
} from '@/types/VoteStats';
import { useCache } from '@/hooks/useCache';
import { useEngagement } from './useEngagement';
import { toast } from '@/hooks/use-toast';
import { useCallback, useEffect } from 'react';
import { ANON_LIMITS } from '@/lib/utils';

const ANON_VOTES_KEY = 'whatgov_anon_votes';

interface QueryData {
  pages: Array<{
    items: FeedItem[];
  }>;
}

// Add type guards for raw data
const isRawTopicStats = (data: unknown): data is RawTopicStats => {
  if (typeof data !== 'object' || data === null) {
    console.log('Data is not an object or is null');
    return false;
  }

  if (!('topics' in data)) {
    console.log('No topics property found');
    return false;
  }

  const { topics } = data as { topics: Record<string, unknown> };
  
  // Check if topics is an object
  if (typeof topics !== 'object' || topics === null) {
    console.log('Topics is not an object or is null');
    return false;
  }

  // More permissive check for each topic
  return Object.values(topics).every(topic => {
    if (typeof topic !== 'object' || topic === null) {
      console.log('Topic is not an object or is null');
      return false;
    }

    const hasRequiredProps = [
      'total_votes',
      'aye_votes',
      'no_votes',
    ].every(prop => prop in topic);

    if (!hasRequiredProps) {
      console.log('Missing required properties in topic');
      return false;
    }

    // Make other properties optional
    const t = topic as Record<string, unknown>;
    
    // Check arrays if they exist
    if (t.top_questions && !Array.isArray(t.top_questions)) return false;
    if (t.vote_history && !Array.isArray(t.vote_history)) return false;
    if (t.speakers && !Array.isArray(t.speakers)) return false;
    if (t.subtopics && !Array.isArray(t.subtopics)) return false;

    return true;
  });
};

const isRawUserTopicStats = (data: unknown): data is RawUserVotingStats => {
  if (typeof data !== 'object' || data === null) return false;
  
  const typedData = data as Partial<RawUserVotingStats>;
  return (
    typeof typedData.totalVotes === 'number' &&
    typeof typedData.userAyeVotes === 'number' &&
    typeof typedData.userNoVotes === 'number' &&
    typeof typedData.topic_stats === 'object' &&
    Array.isArray(typedData.vote_stats)
  );
};

// Define the query key type
type UserTopicVotesKey = readonly ['userTopicVotes', string | undefined];

type TopicVoteStatsKey = readonly ['topicVoteStats'];

// Add type for anonymous vote storage
interface AnonVoteStorage {
  votes: VoteData[];
  lastResetDate: string;
  dailyCount: number;
}

export function useVotes(): UseVotesReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getCache, setCache, CACHE_KEYS } = useCache();
  const { recordVote, hasReachedVoteLimit, getRemainingVotes } = useEngagement();

  // Topic Vote Stats with caching
  const topicVoteStats = useQuery<RawTopicStats, Error, TopicStats, TopicVoteStatsKey>({
    queryKey: ['topicVoteStats'] as const,
    queryFn: async () => {
      // Try cache first
      const cached = await getCache<RawTopicStats>(CACHE_KEYS.topicVoteStats.key());
      if (cached) {
        return cached;
      }

      // Fetch fresh data if no cache
      const data = await getTopicVoteStats();
      if (!isRawTopicStats(data)) {
        throw new Error('Invalid response format from getTopicVoteStats');
      }

      // Cache the fresh data
      await setCache(CACHE_KEYS.topicVoteStats.key(), data, CACHE_KEYS.topicVoteStats.ttl); // 5 minute TTL
      return data;
    },
    select: (data: RawTopicStats): TopicStats => {
      return {
        topics: Object.entries(data.topics).reduce<Record<string, TopicStatsEntry>>((acc, [topic, stats]) => ({
          ...acc,
          [topic]: {
            total_votes: Number(stats.total_votes),
            aye_votes: Number(stats.aye_votes),
            no_votes: Number(stats.no_votes),
            top_questions: (stats.top_questions || []).map(q => ({
              question: q.question,
              total_votes: Number(q.ayes) + Number(q.noes),
              aye_votes: Number(q.ayes),
              no_votes: Number(q.noes)
            })),
            vote_history: stats.vote_history || [],
            speakers: stats.speakers || [],
            frequency: stats.frequency || 1,
            subtopics: stats.subtopics || []
          }
        }), {})
      };
    },
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep in React Query cache for 30 minutes
  });

  // User Topic Votes with caching
  const userTopicVotes = useQuery<RawUserVotingStats, Error, UserTopicStats, UserTopicVotesKey>({
    queryKey: ['userTopicVotes', user?.id] as const,
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      // Try cache first
      const cacheKey = CACHE_KEYS.userTopicVotes.key(user.id);
      const cached = await getCache<RawUserVotingStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch fresh data if no cache
      const data = await getUserTopicVotes();
      if (!isRawUserTopicStats(data)) {
        throw new Error('Invalid response format from getUserTopicVotes');
      }

      // Cache the fresh data
      await setCache(cacheKey, data, CACHE_KEYS.userTopicVotes.ttl); // 5 minute TTL
      return data;
    },
    enabled: !!user,
    select: (data: RawUserVotingStats): UserTopicStats => {
      return {
        user_topics: Object.entries(data.topic_stats || {}).reduce<Record<string, UserTopicStatsEntry>>((acc, [topic, stats]) => {
          if (!stats) return acc;
          
          return {
            ...acc,
            [topic]: {
              total_votes: stats.total || 0,
              aye_votes: stats.ayes || 0,
              no_votes: stats.noes || 0,
              vote_history: (data.vote_stats || [])
                .filter(vs => vs?.topicVotes?.[topic])
                .map(vs => ({
                  vote: vs.topicVotes[topic].ayes > 0,
                  title: stats.details?.[0]?.question_1?.text || '',
                  topic: topic,
                  question: stats.details?.[0]?.question_1?.text || '',
                  debate_id: '', // This might need to come from somewhere else
                  created_at: vs.timestamp
                })),
              speakers: Array.isArray(stats.details?.[0]?.speakers) ? stats.details[0].speakers : [],
              frequency: Array.isArray(stats.frequency) ? stats.frequency[0] || 1 : 1,
              subtopics: Array.isArray(stats.subtopics) ? stats.subtopics.map(String) : []
            }
          };
        }, {})
      };
    },
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep in React Query cache for 30 minutes
  });

  // Demographic Stats with caching
  const demographicStats = useQuery<DemographicStats>({
    queryKey: ['demographicStats'] as const,
    queryFn: async () => {
      const cached = await getCache<DemographicStats>(CACHE_KEYS.demographicStats.key());
      if (cached) {
        return cached;
      }

      const data = await getDemographicVoteStats();
      await setCache(CACHE_KEYS.demographicStats.key(), data, CACHE_KEYS.demographicStats.ttl);
      return data;
    },
    staleTime: 1000 * 60 * 15,
    cacheTime: 1000 * 60 * 60,
  });

  // Helper functions for anonymous votes
  const getAnonVotes = useCallback((): AnonVoteStorage => {
    const defaultStorage: AnonVoteStorage = {
      votes: [],
      lastResetDate: new Date().toISOString(),
      dailyCount: 0
    };

    if (typeof window === 'undefined') return defaultStorage;

    try {
      const stored = localStorage.getItem(ANON_VOTES_KEY);
      if (!stored) return defaultStorage;
      
      const data = JSON.parse(stored);
      
      // Validate the structure and ensure votes array exists
      if (!data || !Array.isArray(data.votes)) {
        return defaultStorage;
      }
      
      // Check if we need to reset daily count
      const lastReset = new Date(data.lastResetDate);
      const now = new Date();
      if (lastReset.getUTCDate() !== now.getUTCDate()) {
        return {
          votes: data.votes || [],
          lastResetDate: now.toISOString(),
          dailyCount: 0
        };
      }
      
      return {
        votes: data.votes || [],
        lastResetDate: data.lastResetDate || new Date().toISOString(),
        dailyCount: typeof data.dailyCount === 'number' ? data.dailyCount : 0
      };
    } catch {
      return defaultStorage;
    }
  }, []);

  const saveAnonVote = useCallback((voteData: VoteData) => {
    if (typeof window === 'undefined') return;
    
    const storage = getAnonVotes();
    const exists = storage.votes.some(v => 
      v.debate_id === voteData.debate_id
    );
    
    if (!exists) {
      const newStorage = {
        votes: [...storage.votes, voteData],
        lastResetDate: storage.lastResetDate,
        dailyCount: storage.dailyCount + 1
      };
      localStorage.setItem(ANON_VOTES_KEY, JSON.stringify(newStorage));
    }
  }, [getAnonVotes]);

  // Update hasVoted to use the new storage format
  const hasVoted = useCallback((debate_id: string): boolean => {
    if (user) {
      const existingVotes = queryClient.getQueryData<Map<string, Map<number, boolean>>>(['votes']);
      return !!existingVotes?.get(debate_id);
    } else {
      const storage = getAnonVotes();
      return storage.votes.some(v => 
        v.debate_id === debate_id
      );
    }
  }, [user, queryClient, getAnonVotes]);

  const { mutate: submitVoteMutation } = useMutation({
    mutationFn: async (voteData: Parameters<typeof submitVote>[0]) => {
      if (!user) {
        const storage = getAnonVotes();
        
        // Check daily limit
        if (storage.dailyCount >= ANON_LIMITS.DAILY_VOTES) {
          throw new Error('Daily vote limit reached');
        }
        
        // Record anonymous vote
        const anonVoteData: VoteData = {
          ...voteData,
          timestamp: new Date().toISOString()
        };
        saveAnonVote(anonVoteData);
        recordVote();
        return;
      }

      // Handle authenticated user vote
      try {
        await submitVote(voteData);
        
        // Invalidate all relevant caches in parallel
        await Promise.all([
          setCache(CACHE_KEYS.topicVoteStats.key(), null),
          setCache(CACHE_KEYS.userTopicVotes.key(user.id), null),
          setCache(CACHE_KEYS.demographicStats.key(), null),
          // Invalidate React Query cache
          queryClient.invalidateQueries({ queryKey: ['topicVoteStats'] }),
          queryClient.invalidateQueries({ queryKey: ['userTopicVotes', user.id] }),
          queryClient.invalidateQueries({ queryKey: ['demographicStats'] })
        ]);

        recordVote(); // Record the vote in engagement stats
      } catch (error) {
        // Ensure error is properly propagated
        console.error('Vote submission error:', error);
        throw error;
      }
    },
    onMutate: async ({ debate_id, vote }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['feed', { votedOnly: false }] 
      });

      const previousFeed = queryClient.getQueryData(['feed', { votedOnly: false }]);

      // Skip optimistic update if already voted
      if (hasVoted(debate_id)) {
        return { previousFeed };
      }

      // Optimistically update UI
      if (user) {
        queryClient.setQueryData(['votes'], (old: Map<string, Map<number, boolean>> | undefined) => {
          const newVotes = new Map(old || new Map());
          if (!newVotes.has(debate_id)) {
            newVotes.set(debate_id, new Map());
          }
          newVotes.get(debate_id)!.set(1, vote);
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
              
              return {
                ...item,
                ai_question_ayes: item.ai_question_ayes + (vote ? 1 : 0),
                ai_question_noes: item.ai_question_noes + (!vote ? 1 : 0)
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
            debateVotes.delete(1);
          }
          return newVotes;
        });
      } else {
        // Remove from local storage for anonymous users
        const votes = getAnonVotes();
        const filteredVotes = votes.votes.filter(v => 
          v.debate_id !== variables.debate_id
        );
        localStorage.setItem(ANON_VOTES_KEY, JSON.stringify({
          votes: filteredVotes,
          lastResetDate: votes.lastResetDate,
          dailyCount: votes.dailyCount
        }));
      }

      // Show appropriate error message
      if (err instanceof Error) {
        if (err.message === 'Daily vote limit reached') {
          toast({
            title: "Vote Limit Reached",
            description: "Create an account to vote on unlimited debates"
          });
        } else {
          toast({
            title: "Vote Failed",
            description: "Please try again later",
            variant: "destructive"
          });
        }
      }
    }
  });

  const migrateAnonVotesOnSignup = useCallback(async () => {
    if (!user) return;
    
    const storage = getAnonVotes();
    if (storage.votes.length === 0) return;
    
    try {
      await migrateAnonymousVotes(storage.votes);
      // Clear anonymous votes after successful migration
      localStorage.setItem(ANON_VOTES_KEY, JSON.stringify({
        votes: [],
        lastResetDate: new Date().toISOString(),
        dailyCount: 0
      }));
    } catch (error) {
      console.error('Failed to migrate anonymous votes:', error);
    }
  }, [user, getAnonVotes]);

  // Add effect to trigger migration when user signs in
  useEffect(() => {
    if (user) {
      migrateAnonVotesOnSignup();
    }
  }, [user, migrateAnonVotesOnSignup]);

  return {
    submitVote: submitVoteMutation,
    hasVoted,
    getRemainingVotes,
    hasReachedVoteLimit,
    topicVoteStats: topicVoteStats.data,
    userTopicVotes: userTopicVotes.data,
    demographicStats: demographicStats.data,
    isLoading: topicVoteStats.isLoading || userTopicVotes.isLoading || demographicStats.isLoading
  };
} 