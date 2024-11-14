import { createClient } from '@supabase/supabase-js'
import { FeedItem } from '@/types'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


export type AuthError = {
  message: string;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
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

// Type for database response
type DbResponse<T> = {
  data: T | null;
  error: any;
}

// Type for debate vote record
interface DebateVote {
  debate_id: string;
  question_number: number;
  vote: boolean;
}

// Optimized feed query
export async function getFeedItems(
  pageSize: number = 8,
  cursor?: string,
  votedOnly: boolean = false,
  userTopics: string[] = []
): Promise<{ items: FeedItem[]; nextCursor?: string }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    throw new Error('User not authenticated');
  }

  if (votedOnly) {
    const { data: votedIds, error: votesError } = await supabase
      .from('debate_votes')
      .select('debate_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as DbResponse<{ debate_id: string }[]>;

    if (votesError) throw votesError;
    
    if (!votedIds?.length) {
      return { items: [], nextCursor: undefined };
    }

    const { data, error } = await supabase
      .rpc('get_debates_with_engagement', {
        p_debate_ids: votedIds.map(v => v.debate_id),
        p_limit: pageSize + 1,
        p_cursor: cursor || null
      }) as DbResponse<FeedItem[]>;

    if (error) throw error;
    if (!data) return { items: [], nextCursor: undefined };

    const hasMore = data.length > pageSize;
    const items = data.slice(0, pageSize);
    const nextCursor = hasMore ? items[items.length - 1].date : undefined;

    return { items, nextCursor };
  }

  // For non-voted debates
  const { data: votedDebates, error: votesError } = await supabase
    .from('debate_votes')
    .select('debate_id')
    .eq('user_id', user.id) as DbResponse<{ debate_id: string }[]>;

  if (votesError) throw votesError;

  const votedDebateIds = votedDebates?.map(v => v.debate_id) || [];

  const { data, error } = await supabase
    .rpc('get_unvoted_debates_with_engagement', {
      p_user_id: user.id,
      p_limit: pageSize * 2,
      p_cursor: cursor || null
    }) as DbResponse<FeedItem[]>;

  if (error) throw error;
  if (!data) return { items: [], nextCursor: undefined };

  // Calculate final scores and sort
  const scoredDebates = data.map(debate => ({
    debate,
    finalScore: calculateFinalScore(
      debate.interest_score,
      userTopics,
      Object.keys(debate.ai_topics),
      debate.engagement_count
    ) + ((Math.random() * 0.2) - 0.1) // Add random factor (-0.1 to 0.1)
  }));

  // Sort by final score
  const sortedDebates = scoredDebates
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, pageSize + 1);

  const hasMore = sortedDebates.length > pageSize;
  const items = sortedDebates.slice(0, pageSize).map(item => item.debate);
  const nextCursor = hasMore ? items[items.length - 1].date : undefined;

  return { items, nextCursor };
}

export async function getUserVotes(debateIds: string[]) {
  const { data: votes, error } = await supabase
    .from('debate_votes')
    .select('debate_id, question_number, vote')
    .in('debate_id', debateIds) as DbResponse<DebateVote[]>;

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
  // Start a transaction to update both the vote record and the count
  const { data, error } = await supabase.rpc('submit_debate_vote', {
    p_debate_id: debate_id,
    p_question_number: question_number,
    p_vote: vote
  });

  if (error) throw error;
  return data;
}

// Add this interface for debate scoring
interface DebateScore {
  id: string;
  score: number;
  factors: {
    engagement: number;    // Based on votes
    controversy: number;   // Based on tone and vote split
    participation: number; // Based on speakers and contributions
    diversity: number;    // Based on party count
    discussion: number;   // Based on key points support/opposition
  };
}

// Add this new function
export async function lookupPostcode(postcode: string) {
  // Clean the postcode - remove spaces and convert to uppercase
  const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
  
  const { data, error } = await supabase
    .from('postcode_lookup')
    .select('mp, constituency')
    .eq('postcode', cleanPostcode) // Use exact match instead of ilike
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
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
