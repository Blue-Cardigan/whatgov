import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { submitVote, getTopicVoteStats, getUserTopicVotes, getDemographicVoteStats } from '@/lib/supabase';
import { FeedItem } from '@/types';
import { useAuth } from './useAuth';
import type { 
  TopicStats, 
  UserTopicStats, 
  DemographicStats, 
  VoteData,
  TopicStatsEntry,
  UserTopicStatsEntry
} from '@/types/VoteStats';
import { useCache } from '@/hooks/useCache';

const ANON_VOTES_KEY = 'whatgov_anon_votes';

interface QueryData {
  pages: Array<{
    items: FeedItem[];
  }>;
}

// Add type for the hook's return value
interface UseVotesReturn {
  submitVote: (voteData: Parameters<typeof submitVote>[0]) => void;
  hasVoted: (debate_id: string, question_number: number) => boolean;
  topicVoteStats: TopicStats | undefined;
  userTopicVotes: UserTopicStats | undefined;
  demographicStats: DemographicStats | undefined;
  isLoading: boolean;
}

// Add type for raw response data
interface RawTopicStats {
  topics: Record<string, {
    total_votes: string | number;
    aye_votes: string | number;
    no_votes: string | number;
    frequency: number;
    top_questions: Array<{
      question: string;
      ayes: string | number;
      noes: string | number;
    }>;
    vote_history: Array<{
      vote: boolean;
      title: string;
      topic: string;
      question: string;
      debate_id: string;
      created_at: string;
    }>;
    speakers: string[];
    subtopics: string[];
  }>;
}

interface RawDemographicStats {
  user_demographics: {
    constituency?: string;
    gender?: string;
    age_group?: string;
  };
  gender_breakdown: Record<string, {
    total_votes: number | string;
    aye_percentage: number | string;
  }>;
  age_breakdown: Record<string, {
    total_votes: number | string;
    aye_percentage: number | string;
  }>;
  constituency_breakdown: Record<string, {
    total_votes: number | string;
    aye_votes: number | string;
    no_votes: number | string;
  }>;
}

interface RawUserVotingStats {
  totalVotes: number;
  userAyeVotes: number;
  userNoVotes: number;
  topic_stats: Record<string, {
    total: number;
    ayes: number;
    noes: number;
    subtopics: unknown[];
    details: Array<{
      tags: string[];
      question_1: { text: string; topic: string; ayes: number; noes: number; };
      question_2: { text: string; topic: string; ayes: number; noes: number; };
      question_3: { text: string; topic: string; ayes: number; noes: number; };
      speakers: string[];
    }>;
    frequency: number[];
  }>;
  vote_stats: Array<{
    timestamp: string;
    userAyes: number;
    userNoes: number;
    topicVotes: Record<string, { ayes: number; noes: number; }>;
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

const transformDemographicStats = (raw: RawDemographicStats): DemographicStats => ({
  userDemographics: {
    constituency: raw.user_demographics?.constituency,
    gender: raw.user_demographics?.gender,
    age_group: raw.user_demographics?.age_group
  },
  gender_breakdown: Object.entries(raw.gender_breakdown).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: {
      total_votes: Number(value.total_votes),
      aye_percentage: Number(value.aye_percentage)
    }
  }), {}),
  age_breakdown: Object.entries(raw.age_breakdown).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: {
      total_votes: Number(value.total_votes),
      aye_percentage: Number(value.aye_percentage)
    }
  }), {}),
  constituency_breakdown: Object.entries(raw.constituency_breakdown).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: {
      total_votes: Number(value.total_votes),
      aye_votes: Number(value.aye_votes),
      no_votes: Number(value.no_votes)
    }
  }), {})
});

export function useVotes(): UseVotesReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getCache, setCache, CACHE_KEYS } = useCache();

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
  const demographicStats = useQuery<RawDemographicStats, Error, DemographicStats>({
    queryKey: ['demographicStats'] as const,
    queryFn: async () => {
      // Try cache first
      const cached = await getCache<RawDemographicStats>(CACHE_KEYS.demographicStats.key());
      if (cached) {
        return cached;
      }

      // Fetch fresh data if no cache
      const data = await getDemographicVoteStats();
      
      // Cache the fresh data
      await setCache(CACHE_KEYS.demographicStats.key(), data, CACHE_KEYS.demographicStats.ttl); // 15 minute TTL
      return data;
    },
    select: transformDemographicStats,
    staleTime: 1000 * 60 * 15, // Consider data stale after 15 minutes
    cacheTime: 1000 * 60 * 60, // Keep in React Query cache for 1 hour
  });

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
      const existingVotes = queryClient.getQueryData<Map<string, Map<number, boolean>>>(['votes']);
      return !!existingVotes?.get(debate_id)?.has(question_number);
    } else {
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
        await submitVote(voteData);
        // Invalidate caches after successful vote
        await Promise.all([
          setCache(CACHE_KEYS.topicVoteStats.key(), null),
          setCache(CACHE_KEYS.userTopicVotes.key(user.id), null),
          setCache(CACHE_KEYS.demographicStats.key(), null)
        ]);
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ['topicVoteStats'] });
        queryClient.invalidateQueries({ queryKey: ['userTopicVotes', user.id] });
        queryClient.invalidateQueries({ queryKey: ['demographicStats'] });
      } else {
        const anonVoteData: VoteData = {
          ...voteData,
          timestamp: new Date().toISOString()
        };
        saveAnonVote(anonVoteData);
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
    hasVoted,
    topicVoteStats: topicVoteStats.data,
    userTopicVotes: userTopicVotes.data,
    demographicStats: demographicStats.data,
    isLoading: topicVoteStats.isLoading || userTopicVotes.isLoading || demographicStats.isLoading
  };
} 