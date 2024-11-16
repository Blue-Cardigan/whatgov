'use client'

import { Session } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { createClient } from './supabase-client'
import type { FeedItem, DebateVote, InterestFactors, KeyPoint, AiTopics, PartyCount } from '@/types'
import type { Database, Json } from '@/types/supabase';
import type { UserVotingStats, TopicStats, TopicStatsRaw, VoteStatsEntry } from '@/types/VoteStats';
export type AuthError = {
  message: string;
}

export type AuthResponse = {
  user: User | null;
  session: Session | null;
  error?: string;
  status?: 'verify_email' | 'error' | 'success';
};

export type UserProfile = {
  name: string;
  gender: string;
  age: string;
  postcode: string;
  constituency: string;
  mp: string;
  selected_topics: string[];
  email: string;
  email_verified?: boolean;
};

const getSupabase = () => createClient()

export const signUpWithEmail = async (
  email: string, 
  password: string,
  profile: UserProfile
): Promise<AuthResponse> => {
  const serviceClient = createClient();

  try {
    const { data, error } = await serviceClient.rpc(
      'create_user_with_profile',
      {
        user_email: email,
        user_password: password,
        user_name: profile.name,
        user_gender: profile.gender,
        user_postcode: profile.postcode,
        user_constituency: profile.constituency,
        user_mp: profile.mp,
        user_selected_topics: profile.selected_topics
      }
    );

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'User creation failed');

    const encodedToken = encodeURIComponent(data.confirmation_token);
    const confirmationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accounts/verify?token=${encodedToken}`;
    
    const emailResponse = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        confirmationLink,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send verification email');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('verification_email', email);
    }

    return {
      user: { id: data.user_id, email } as User,
      session: null,
      status: 'verify_email'
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 'error'
    };
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const supabase = getSupabase()
  try {
    // First attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: error.message
      };
    }

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        user: null,
        session: null,
        error: 'Please verify your email before signing in',
        status: 'verify_email'
      };
    }

    // Only check profile after successful authentication, using the user's ID
    if (data.user?.id) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .select('email_verified')
        .eq('id', data.user.id)  // Changed from 'id' to 'user_id'
        .single();

      if (profileError) {
        console.error('Profile check error:', profileError);
      }
    }

    return {
      user: data.user,
      session: data.session
    };

  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      session: null,
      error: 'An unexpected error occurred during sign in'
    };
  }
};

// Update getFeedItems function
export async function getFeedItems(
  pageSize: number = 8,
  cursor?: string,
  votedOnly: boolean = false,
  userTopics: string[] = []
): Promise<{ items: FeedItem[]; nextCursor?: string }> {
  const supabase = getSupabase()
  
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // If user requests voted debates but isn't authenticated, return empty set
    if (votedOnly && !user) {
      return { items: [] };
    }

    if (user) {
      // Authenticated user flow - same as before
      if (votedOnly) {
        const { data: debates, error } = await supabase.rpc('get_voted_debates', {
          p_limit: pageSize + 1,
          p_cursor: cursor || undefined
        });
        
        if (error) throw error;
        if (!debates) return { items: [] };
        
        return processDebates(debates, pageSize, userTopics);
      } else {
        const { data: debates, error } = await supabase.rpc('get_unvoted_debates', {
          p_user_id: user.id,
          p_limit: pageSize + 1,
          p_cursor: cursor || undefined
        });
        
        if (error) throw error;
        if (!debates) return { items: [] };
        
        return processDebates(debates, pageSize, userTopics);
      }
    } else {
      // Unauthenticated user flow - fetch using get_unvoted_debates_unauth
      const { data: debates, error } = await supabase.rpc('get_unvoted_debates_unauth', {
        p_limit: pageSize + 1,
        p_cursor: cursor || undefined
      });

      if (error) throw error;
      if (!debates) return { items: [] };

      return processDebates(debates, pageSize, userTopics);
    }
  } catch (error) {
    console.error('getFeedItems error:', error);
    throw error;
  }
}

// Helper function to safely parse JSON fields
function parseKeyPoints(json: Json): KeyPoint[] {
  if (!Array.isArray(json)) return [];
  
  return json.map(item => {
    if (typeof item !== 'object' || !item) return null;
    
    const keyPoint = item as Record<string, unknown>;
    if (
      typeof keyPoint.point !== 'string' ||
      typeof keyPoint.speaker !== 'string' ||
      !Array.isArray(keyPoint.support) ||
      !Array.isArray(keyPoint.opposition)
    ) {
      return null;
    }

    return {
      point: keyPoint.point,
      speaker: keyPoint.speaker,
      support: keyPoint.support.filter((s): s is string => typeof s === 'string'),
      opposition: keyPoint.opposition.filter((o): o is string => typeof o === 'string')
    };
  }).filter((item): item is KeyPoint => item !== null);
}

// Add this helper function to safely parse InterestFactors
function parseInterestFactors(json: Json): InterestFactors {
  const defaultFactors: InterestFactors = {
    diversity: 0,
    discussion: 0,
    controversy: 0,
    participation: 0
  };

  if (typeof json !== 'object' || !json) return defaultFactors;

  const factors = json as Record<string, unknown>;
  
  return {
    diversity: typeof factors.diversity === 'number' ? factors.diversity : 0,
    discussion: typeof factors.discussion === 'number' ? factors.discussion : 0,
    controversy: typeof factors.controversy === 'number' ? factors.controversy : 0,
    participation: typeof factors.participation === 'number' ? factors.participation : 0
  };
}

// Helper function to process debates
function processDebates(
  debates: Database['public']['Functions']['get_unvoted_debates']['Returns'],
  pageSize: number,
  userTopics: string[]
): { items: FeedItem[]; nextCursor?: string } {
  const hasMore = debates.length > pageSize;
  const items = hasMore ? debates.slice(0, -1) : debates;
  const nextCursor = hasMore ? items[items.length - 1].result_id : undefined;

  const processedItems: FeedItem[] = items.map(debate => ({
    id: debate.result_id,
    ext_id: debate.ext_id,
    title: debate.title,
    date: debate.date,
    location: debate.location,
    ai_title: debate.ai_title ?? '',
    ai_summary: debate.ai_summary ?? '',
    ai_tone: (debate.ai_tone ?? 'neutral') as FeedItem['ai_tone'],
    ai_tags: Array.isArray(debate.ai_tags) 
      ? (JSON.parse(debate.ai_tags) as string[]).filter((tag): tag is string => typeof tag === 'string')
      : [],
    ai_key_points: parseKeyPoints(JSON.parse(debate.ai_key_points)),
    ai_topics: JSON.parse(debate.ai_topics) as AiTopics,
    speaker_count: debate.speaker_count,
    contribution_count: debate.contribution_count,
    party_count: JSON.parse(debate.party_count ?? '{}') as PartyCount,
    interest_score: calculateFinalScore(
      debate.interest_score ?? 0,
      userTopics,
      debate.ai_topics ? Object.keys(JSON.parse(debate.ai_topics) as AiTopics) : [],
      debate.engagement_count ?? 0
    ),
    interest_factors: parseInterestFactors(JSON.parse(debate.interest_factors ?? '{}')),
    engagement_count: debate.engagement_count ?? 0,
    ai_question_1: debate.ai_question_1 ?? '',
    ai_question_1_topic: debate.ai_question_1_topic ?? '',
    ai_question_1_ayes: debate.ai_question_1_ayes ?? 0,
    ai_question_1_noes: debate.ai_question_1_noes ?? 0,
    ai_question_2: debate.ai_question_2 ?? '',
    ai_question_2_topic: debate.ai_question_2_topic ?? '',
    ai_question_2_ayes: debate.ai_question_2_ayes ?? 0,
    ai_question_2_noes: debate.ai_question_2_noes ?? 0,
    ai_question_3: debate.ai_question_3 ?? '',
    ai_question_3_topic: debate.ai_question_3_topic ?? '',
    ai_question_3_ayes: debate.ai_question_3_ayes ?? 0,
    ai_question_3_noes: debate.ai_question_3_noes ?? 0,
  }));

  return {
    items: processedItems,
    nextCursor
  };
}

export async function submitVote({ debate_id, question_number, vote }: DebateVote) {
  const supabase = getSupabase()
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) throw userError;
  if (!user) {
    throw new Error('Authentication required for voting');
  }

  const { data, error } = await supabase.rpc('submit_debate_vote', {
    p_debate_id: debate_id,
    p_question_number: question_number,
    p_vote: vote
  });

  if (error) throw error;
  return data;
}

// Add this new function
export async function lookupPostcode(postcode: string) {
  const supabase = getSupabase()
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  
  const { data, error } = await supabase
    .from('postcode_lookup')
    .select('mp, constituency')
    .eq('postcode', cleanPostcode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  
  return data;
}

function calculateFinalScore(
  baseScore: number, 
  userTopics: string[],
  debateTopics: string[],
  engagement: number
): number {
  // Topic match bonus (0.1 per matching topic, max 0.3)
  const matchingTopics = debateTopics.filter(topic => 
    userTopics.includes(topic)
  ).length;
  const topicBonus = Math.min(matchingTopics * 0.1, 0.3);

  // Engagement bonus (normalized to 0-0.2)
  const engagementBonus = Math.min(engagement / 100, 0.2);

  // Calculate weighted score
  const finalScore = (
    baseScore * 0.5 +          // Base interest score (50%)
    topicBonus * 0.3 +         // Topic matching (30%)
    engagementBonus * 0.2      // Engagement level (20%)
  );

  return finalScore;
}

export async function getUserVotingStats(timeframe: 'daily' | 'weekly' | 'all' = 'weekly'): Promise<UserVotingStats> {
  const supabase = getSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Authentication required');
  }

  // Calculate date range based on timeframe
  const now = new Date();
  const startDate = new Date();
  let interval: 'hour' | 'day';

  switch (timeframe) {
    case 'daily':
      startDate.setDate(now.getDate() - 1);
      interval = 'hour';
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      interval = 'day';
      break;
    case 'all':
      // Use a reasonable default for "all time" - e.g., 6 months
      startDate.setMonth(now.getMonth() - 6);
      interval = 'day';
      break;
  }

  const { data, error } = await supabase.rpc('get_user_voting_stats', {
    p_user_id: user.id,
    p_start_date: startDate.toISOString(),
    p_end_date: now.toISOString(),
    p_interval: interval
  });

  if (error) throw error;

  // Transform the raw data to match our interface
  const transformedTopicStats: { [topic: string]: TopicStats } = {};

  // Process each topic's stats
  for (const [topic, stats] of Object.entries(data.topic_stats)) {
    const topicStats = stats as TopicStatsRaw;
    transformedTopicStats[topic] = {
      total: topicStats.total,
      ayes: topicStats.ayes,
      noes: topicStats.noes,
      subtopics: topicStats.subtopics || [],
      details: (topicStats.details || []).map((detail) => ({
        tags: detail.tags || [],
        question_1: {
          text: detail.question_1?.text || '',
          topic: detail.question_1?.topic || '',
          ayes: detail.question_1?.ayes || 0,
          noes: detail.question_1?.noes || 0,
        },
        question_2: {
          text: detail.question_2?.text || '',
          topic: detail.question_2?.topic || '',
          ayes: detail.question_2?.ayes || 0,
          noes: detail.question_2?.noes || 0,
        },
        question_3: {
          text: detail.question_3?.text || '',
          topic: detail.question_3?.topic || '',
          ayes: detail.question_3?.ayes || 0,
          noes: detail.question_3?.noes || 0,
        },
        speakers: detail.speakers || [],
      })),
      frequency: topicStats.frequency?.[0] || 0,
    };
  }

  return {
    totalVotes: data.total_votes,
    ayeVotes: data.aye_votes,
    noVotes: data.no_votes,
    topicStats: transformedTopicStats,
    weeklyStats: data.vote_stats.map((stat: VoteStatsEntry) => ({
      timestamp: stat.timestamp,
      ayes: stat.ayes,
      noes: stat.noes,
    })),
  };
}
