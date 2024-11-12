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

interface SignUpMetadata {
  name: string;
  gender: string;
  postcode: string;
  constituency: string;
  mp: string;
  topics: string[];
}

export async function signUpWithEmail(
  email: string, 
  password: string, 
  metadata?: SignUpMetadata
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  
  if (error) throw error;
  return data;
}

// Optimized feed query
export async function getFeedItems(
  pageSize: number = 5,
  cursor?: string,
  votedOnly: boolean = false
): Promise<{ items: FeedItem[]; nextCursor?: string }> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // First, get the debate IDs that the user has voted on
  const { data: votedDebates, error: votesError } = await supabase
    .from('debate_votes')
    .select('debate_id')
    .eq('user_id', userId);

  if (votesError) throw votesError;

  const votedDebateIds = votedDebates?.map(v => v.debate_id) || [];

  // Then query the debates
  let query = supabase
    .from('debates')
    .select(`
      id,
      ext_id,
      title,
      date,
      type,
      house,
      location,
      ai_title,
      ai_summary,
      ai_tone,
      ai_topics,
      ai_tags,
      ai_key_points,
      ai_question_1,
      ai_question_1_topic,
      ai_question_1_ayes,
      ai_question_1_noes,
      ai_question_2,
      ai_question_2_topic,
      ai_question_2_ayes,
      ai_question_2_noes,
      ai_question_3,
      ai_question_3_topic,
      ai_question_3_ayes,
      ai_question_3_noes,
      speaker_count,
      contribution_count,
      party_count
    `);

  // Modified filtering logic
  if (votedOnly) {
    // In "Your Votes", only show debates the user has voted on
    if (votedDebateIds.length === 0) {
      return { items: [], nextCursor: undefined };
    }
    query = query.in('id', votedDebateIds);
  } else {
    // In main feed, exclude debates the user has voted on
    if (votedDebateIds.length > 0) {
      query = query.not('id', 'in', `(${votedDebateIds.join(',')})`);
    }
  }

  query = query
    .order('date', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    query = query.lt('date', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Score and sort the debates
  const scoredDebates = data.slice(0, pageSize).map(debate => ({
    debate,
    ...calculateDebateScore(debate)
  }));

  // Sort by score but with some randomization to maintain variety
  const sortedDebates = scoredDebates.sort((a, b) => {
    const randomFactor = 0.2; // 20% randomness
    const random = (Math.random() * 2 - 1) * randomFactor;
    return (b.score + random) - (a.score + random);
  });

  // Take the top items after scoring and extract just the debate objects
  const hasMore = data.length > pageSize;
  const items = sortedDebates.slice(0, pageSize).map(item => item.debate);
  const nextCursor = hasMore ? items[items.length - 1].date : undefined;

  return { items, nextCursor };
}

interface VoteData {
  debateId: string;
  questionNumber: number;
  vote: boolean; // true for aye, false for no
}

export async function getUserVotes(debateIds: string[]) {
  const { data: votes, error } = await supabase
    .from('debate_votes')
    .select('debate_id, question_number, vote')
    .in('debate_id', debateIds);

  if (error) throw error;
  
  // Transform into a more useful format
  const voteMap = new Map<string, Map<number, boolean>>();
  votes?.forEach(vote => {
    if (!voteMap.has(vote.debate_id)) {
      voteMap.set(vote.debate_id, new Map());
    }
    voteMap.get(vote.debate_id)?.set(vote.question_number, vote.vote);
  });
  
  return voteMap;
}

export async function submitVote({ debateId, questionNumber, vote }: VoteData) {
  // Start a transaction to update both the vote record and the count
  const { data, error } = await supabase.rpc('submit_debate_vote', {
    p_debate_id: debateId,
    p_question_number: questionNumber,
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

// Add this function to calculate debate scores
function calculateDebateScore(debate: FeedItem): DebateScore {
  const factors = {
    engagement: 0,
    controversy: 0,
    participation: 0,
    diversity: 0,
    discussion: 0
  };

  // Calculate engagement score from question responses
  const questionVotes = [1, 2, 3].map(num => {
    const ayes = debate[`ai_question_${num}_ayes` as keyof FeedItem] as number || 0;
    const noes = debate[`ai_question_${num}_noes` as keyof FeedItem] as number || 0;
    return { ayes, noes, total: ayes + noes };
  });
  
  factors.engagement = questionVotes.reduce((sum, { total }) => sum + total, 0) / 3;

  // Calculate controversy score
  factors.controversy = (
    (debate.ai_tone === 'contentious' ? 1 : 
     debate.ai_tone === 'collaborative' ? 0.3 : 
     0.6) +
    questionVotes.reduce((sum, { ayes, noes, total }) => {
      if (total === 0) return sum;
      const split = Math.min(ayes, noes) / Math.max(ayes, noes);
      return sum + split;
    }, 0) / 3
  ) / 2;

  // Calculate participation score
  factors.participation = (
    Math.min(debate.speaker_count / 20, 1) * 0.4 +
    Math.min(debate.contribution_count / 50, 1) * 0.6
  );

  // Calculate party diversity score
  const partyCount = debate.party_count as Record<string, number>;
  const parties = Object.keys(partyCount).length;
  const partyDistribution = Object.values(partyCount).reduce((sum, count) => {
    const proportion = count / debate.speaker_count;
    return sum - (proportion * Math.log2(proportion)); // Shannon entropy
  }, 0);
  factors.diversity = Math.min(
    (parties / 6) * 0.4 + (partyDistribution / 2) * 0.6,
    1
  );

  // Calculate discussion quality score
  const keyPoints = debate.ai_key_points as Array<{
    support: string[];
    opposition: string[];
  }>;
  const pointsWithInteraction = keyPoints?.filter(
    point => point.support.length + point.opposition.length > 0
  ).length || 0;
  factors.discussion = Math.min(pointsWithInteraction / 5, 1);

  // Calculate final score with weights
  const score = (
    factors.engagement * 0.25 +
    factors.controversy * 0.2 +
    factors.participation * 0.2 +
    factors.diversity * 0.2 +
    factors.discussion * 0.15
  );

  return {
    id: debate.id,
    score,
    factors
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
