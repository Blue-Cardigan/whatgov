'use client'

import createClient from './client'
import type { DebateVote } from '@/types'
import type { VoteData, RawTopicStats, RawUserVotingStats } from '@/types/VoteStats'
import { CACHE_KEYS } from '../redis/config'
import { setSubscriptionCache } from './subscription'
import { getDemographicVoteStats } from './myparliament'

export async function submitVote({ debate_id, vote }: DebateVote) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) throw userError;
  if (!user) {
    throw new Error('Authentication required for voting');
  }

  try {
    // Call the RPC function
    const { data, error } = await supabase.rpc('submit_debate_vote', {
      p_debate_id: debate_id,
      p_vote: vote
    });

    if (error) {
      console.error('Vote submission error:', error);
      throw new Error(error.message || 'Failed to submit vote');
    }

    // Batch warm the caches with fresh data
    await fetch('/api/cache/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          {
            key: CACHE_KEYS.topicVoteStats.key(),
            fetcher: getTopicVoteStats,
            ttl: CACHE_KEYS.topicVoteStats.ttl
          },
          {
            key: CACHE_KEYS.userTopicVotes.key(user.id),
            fetcher: getUserTopicVotes,
            ttl: CACHE_KEYS.userTopicVotes.ttl
          },
          {
            key: CACHE_KEYS.demographicStats.key(),
            fetcher: getDemographicVoteStats,
            ttl: CACHE_KEYS.demographicStats.ttl
          }
        ]
      })
    }).catch(error => {
      // Log but don't throw - cache warming failure shouldn't affect vote submission
      console.error('Cache warming error:', error);
    });

    // Clear subscription cache since voting might affect limits
    await setSubscriptionCache(user.id, null);

    return data;
  } catch (error) {
    console.error('Vote submission error:', error);
    throw error;
  }
}

export const migrateAnonymousVotes = async (
  votes: VoteData[],
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  const supabase = createClient();
  
  try {
    // Use provided userId or get from current session
    let authenticatedUserId = userId;
    if (!authenticatedUserId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');
      authenticatedUserId = user.id;
    }

    // Batch votes into groups of 10
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < votes.length; i += batchSize) {
      batches.push(votes.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      const { error } = await supabase.rpc('migrate_anonymous_votes', {
        p_user_id: authenticatedUserId,
        p_votes: batch.map(vote => ({
          debate_id: vote.debate_id,
          vote: vote.vote,
          created_at: vote.timestamp
        }))
      });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Vote migration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to migrate votes'
    };
  }
};

export const getTopicVoteStats = async (): Promise<RawTopicStats> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_topic_vote_stats');
  
  if (error) throw error;
  return data as RawTopicStats;
};

export const getUserTopicVotes = async (): Promise<RawUserVotingStats> => {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) throw new Error('Authentication required');

  const { data, error } = await supabase.rpc('get_user_voting_stats', {
    p_user_id: user.id,
    p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_end_date: new Date().toISOString(),
    p_interval: 'day'
  });
  
  if (error) throw error;
  return data as RawUserVotingStats;
}; 