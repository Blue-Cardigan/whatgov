import { supabaseClient } from './supabase-client'
import type { FeedItem, DebateVote, InterestFactors, KeyPoint, AiTopics, PartyCount } from '@/types'

export type AuthError = {
  message: string;
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;

    // Verify user exists
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Failed to verify user');
    }

    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      // For development, automatically confirm users
      data: {
        email_confirmed: true
      }
    }
  });

  if (error) throw error;
  return data;
};

// Optimized feed query
export async function getFeedItems(
  pageSize: number = 8,
  cursor?: string,
  votedOnly: boolean = false,
  userTopics: string[] = []
): Promise<{ items: FeedItem[]; nextCursor?: string }> {
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) throw userError;
    if (votedOnly && !user) {
      throw new Error('Authentication required for voted items');
    }

    // Only include cursor parameter if it's a non-empty string
    const params = votedOnly 
      ? {
          p_user_id: user!.id,
          p_limit: pageSize + 1,
          ...(cursor ? { p_cursor: cursor } : {})
        }
      : {
          p_limit: pageSize + 1,
          ...(cursor ? { p_cursor: cursor } : {})
        };

    const { data: debates, error } = votedOnly 
      ? await supabaseClient.rpc('get_unvoted_debates_with_engagement', params as { p_user_id: string; p_limit: number; p_cursor: string })
      : await supabaseClient.rpc('get_debates_with_engagement', params as { p_debate_ids: string[]; p_limit: number; p_cursor: string });

    if (error) throw error;

    // Handle pagination
    const hasMore = debates && debates.length > pageSize;
    const items = hasMore ? debates.slice(0, -1) : (debates || []);
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    // Transform database items to FeedItems with proper type casting
    const processedItems: FeedItem[] = items.map((debate) => {
      // Safely cast complex JSON types
      const keyPoints = Array.isArray(debate.ai_key_points) 
        ? (debate.ai_key_points as unknown as KeyPoint[]) 
        : [];

      const interestFactors = typeof debate.interest_factors === 'object' && debate.interest_factors
        ? (debate.interest_factors as unknown as InterestFactors)
        : {
            diversity: 0,
            discussion: 0,
            controversy: 0,
            participation: 0
          };

      const aiTopics = typeof debate.ai_topics === 'object' && debate.ai_topics
        ? (debate.ai_topics as unknown as AiTopics)
        : {};

      const partyCount = typeof debate.party_count === 'object' && debate.party_count
        ? (debate.party_count as unknown as PartyCount)
        : {};

      return {
        id: debate.id,
        ext_id: debate.id,
        title: debate.title,
        date: debate.date,
        location: debate.location,
        ai_title: debate.ai_title || '',
        ai_summary: debate.ai_summary || '',
        ai_tone: (debate.ai_tone as 'neutral' | 'contentious' | 'collaborative') || 'neutral',
        ai_tags: Array.isArray(debate.ai_tags) ? debate.ai_tags as string[] : [],
        ai_key_points: keyPoints,
        ai_topics: aiTopics,
        speaker_count: debate.speaker_count || 0,
        contribution_count: debate.contribution_count || 0,
        party_count: partyCount,
        interest_score: calculateFinalScore(
          debate.interest_score || 0,
          userTopics,
          debate.ai_topics ? Object.keys(aiTopics) : [],
          debate.engagement_count || 0
        ),
        interest_factors: interestFactors,
        engagement_count: debate.engagement_count || 0,
        ai_question_1: debate.ai_question_1 || '',
        ai_question_1_topic: debate.ai_question_1_topic || '',
        ai_question_1_ayes: debate.ai_question_1_ayes || 0,
        ai_question_1_noes: debate.ai_question_1_noes || 0,
        ai_question_2: debate.ai_question_2 || '',
        ai_question_2_topic: debate.ai_question_2_topic || '',
        ai_question_2_ayes: debate.ai_question_2_ayes || 0,
        ai_question_2_noes: debate.ai_question_2_noes || 0,
        ai_question_3: debate.ai_question_3 || '',
        ai_question_3_topic: debate.ai_question_3_topic || '',
        ai_question_3_ayes: debate.ai_question_3_ayes || 0,
        ai_question_3_noes: debate.ai_question_3_noes || 0,
      };
    });

    return {
      items: processedItems,
      nextCursor
    };
    
  } catch (error) {
    console.error('getFeedItems error:', error);
    throw error;
  }
}

export async function getUserVotes(debateIds: string[]) {
  const { data: votes, error } = await supabaseClient
    .from('debate_votes')
    .select('debate_id, question_number, vote')
    .in('debate_id', debateIds);

  if (error) throw error;
  
  const voteMap = new Map<string, Map<number, boolean>>();
  votes?.forEach(vote => {
    if (!voteMap.has(vote.debate_id)) {
      voteMap.set(vote.debate_id, new Map());
    }
    voteMap.get(vote.debate_id)?.set(vote.question_number, vote.vote);
  });
  
  return voteMap;
}

export async function submitVote({ debate_id, question_number, vote }: DebateVote) {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  
  if (userError) throw userError;
  if (!user) {
    throw new Error('Authentication required for voting');
  }

  const { data, error } = await supabaseClient.rpc('submit_debate_vote', {
    p_debate_id: debate_id,
    p_question_number: question_number,
    p_vote: vote
  });

  if (error) throw error;
  return data;
}

// Add this new function
export async function lookupPostcode(postcode: string) {
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  
  const { data, error } = await supabaseClient
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
