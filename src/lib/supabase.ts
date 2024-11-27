'use client'

import { createClient } from './supabase-client'
import type { FeedItem, DebateVote, InterestFactors, KeyPoint, AiTopics, PartyCount, Division, CommentThread, FeedFilters } from '@/types'
import type { Database, Json } from '@/types/supabase';
import type { DemographicStats, RawTopicStats, RawUserVotingStats, VoteData } from '@/types/VoteStats';
import type { AuthResponse, UserProfile } from '@/types/supabase';
import { User } from '@supabase/supabase-js';
import { MPData, MPKeyPoint } from '@/types';
import { CACHE_KEYS } from './redis/config';

const getSupabase = () => createClient()

export const signUpWithEmail = async (
  email: string, 
  password: string,
  profile: UserProfile
): Promise<AuthResponse> => {
  const serviceClient = createClient();

  try {
    // First check if user exists and is verified
    const { data: existingUser, error: checkError } = await serviceClient
      .from('user_profiles')
      .select('email_verified')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // If user exists and is verified, return special status
    if (existingUser?.email_verified) {
      return {
        user: null,
        session: null,
        error: 'An account with this email already exists',
        status: 'redirect_to_login'
      };
    }

    // Proceed with signup
    const { data, error } = await serviceClient.rpc(
      'create_user_with_profile',
      {
        user_email: email,
        user_password: password,
        user_name: profile.name || '',
        user_gender: profile.gender || '',
        user_postcode: profile.postcode || '',
        user_constituency: profile.constituency || '',
        user_mp: profile.mp || '',
        user_mp_id: profile.mp_id || null,
        user_selected_topics: profile.selected_topics || [],
        user_newsletter: profile.newsletter ?? true
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

// First, define a type for the cursor
export type FeedCursor = {
  id: string;
  date: string;
  score: number;
};

// Update getFeedItems signature to accept filters
export async function getFeedItems(
  pageSize: number = 8,
  cursor?: FeedCursor,
  votedOnly: boolean = false,
  filters?: FeedFilters
): Promise<{ 
  items: FeedItem[]; 
  nextCursor?: FeedCursor 
}> {
  const supabase = getSupabase()
  
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // If user requests voted debates but isn't authenticated, return empty set
    if (votedOnly && !user) {
      return { items: [] };
    }

    // Prepare filter parameters for authenticated users only
    const filterParams = user ? {
      p_divisions_only: filters?.divisionsOnly || false,
      p_mp_only: filters?.mpOnly || false,
      
      p_type: filters?.type?.length ? filters.type : null,
      p_location: filters?.location?.length ? filters.location : null,
      p_days: filters?.days?.length ? filters.days : null,
      p_topics: filters?.topics?.length ? filters.topics : null,
    } : {};

    if (user) {
      // Authenticated user flow
      if (votedOnly) {
        const { data: debates, error } = await supabase.rpc('get_voted_debates', {
          p_limit: pageSize + 1,
          p_cursor: cursor || undefined,
          ...filterParams
        });
        
        if (error) throw error;
        if (!debates) return { items: [] };
        
        return processDebates(debates, pageSize);
      } else {
        const { data: debates, error } = await supabase.rpc('get_unvoted_debates', {
          p_user_id: user.id,
          p_limit: pageSize + 1,
          p_cursor: cursor?.id,
          p_cursor_date: cursor?.date,
          p_cursor_score: cursor?.score,
          ...filterParams
        });
        
        if (error) throw error;
        if (!debates) return { items: [] };
        
        return processDebates(debates, pageSize);
      }
    } else {
      // Unauthenticated user flow - only pass cursor-related parameters
      const { data: debates, error } = await supabase.rpc('get_unvoted_debates_unauth', {
        p_limit: pageSize + 1,
        p_cursor: cursor?.id,
        p_cursor_date: cursor?.date,
        p_cursor_score: cursor?.score
      });

      if (error) throw error;
      if (!debates) return { items: [] };

      return processDebates(debates, pageSize);
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
): { items: FeedItem[]; nextCursor?: FeedCursor } {
  const hasMore = debates.length > pageSize;
  const items = hasMore ? debates.slice(0, -1) : debates;
  const nextCursor = hasMore ? {
    id: items[items.length - 1].result_id,
    date: items[items.length - 1].date,
    score: items[items.length - 1].engagement_count || 0
  } : undefined;

  function parseCommentThread(value: unknown): CommentThread[] {
    if (!value) return [];
    
    let parsed: unknown;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch (e) {
        console.error('Error parsing comment thread:', e);
        return [];
      }
    } else {
      parsed = value;
    }

    if (!Array.isArray(parsed)) return [];

    return parsed.map(comment => {
      if (typeof comment !== 'object' || !comment) return null;
      
      const votes = typeof comment.votes === 'object' && comment.votes 
        ? comment.votes 
        : { upvotes: 0, downvotes: 0, upvotes_speakers: [], downvotes_speakers: [] };

      return {
        id: String(comment.id || ''),
        tags: Array.isArray(comment.tags) 
          ? comment.tags.filter((tag: string): tag is string => typeof tag === 'string')
          : [],
        party: String(comment.party || ''),
        votes: {
          upvotes: Number(votes.upvotes) || 0,
          downvotes: Number(votes.downvotes) || 0,
          upvotes_speakers: Array.isArray(votes.upvotes_speakers)
            ? votes.upvotes_speakers.filter((s: string): s is string => typeof s === 'string')
            : [],
          downvotes_speakers: Array.isArray(votes.downvotes_speakers)
            ? votes.downvotes_speakers.filter((s: string): s is string => typeof s === 'string')
            : []
        },
        author: String(comment.author || ''),
        content: String(comment.content || ''),
        parent_id: comment.parent_id ? String(comment.parent_id) : null
      };
    }).filter((comment): comment is CommentThread => comment !== null);
  }

  const processedItems: FeedItem[] = items.map(debate => {
    // Helper to validate ai_tone
    const validateAiTone = (tone: string | null): FeedItem['ai_tone'] => {
      switch (tone) {
        case 'contentious':
        case 'collaborative':
          return tone;
        default:
          return 'neutral';
      }
    };

    // Transform ai_topics from Json to AiTopics type
    const aiTopics: AiTopics = Array.isArray(debate.ai_topics) 
      ? debate.ai_topics.map((topic: unknown) => {
          if (typeof topic !== 'object' || !topic) return {
            name: '',
            speakers: [],
            frequency: 1,
            subtopics: []
          };
          
          const t = topic as Record<string, unknown>;
          return {
            name: typeof t.name === 'string' ? t.name : '',
            speakers: Array.isArray(t.speakers) ? t.speakers : [],
            frequency: typeof t.frequency === 'number' ? t.frequency : 1,
            subtopics: Array.isArray(t.subtopics) ? t.subtopics : []
          };
        })
      : [];

    return {
      id: debate.result_id,
      ext_id: debate.ext_id || '',
      title: debate.title || '',
      date: debate.date || '',
      location: debate.location || '',
      type: debate.type || '',
      ai_title: debate.ai_title || '',
      ai_summary: debate.ai_summary || '',
      ai_tone: validateAiTone(debate.ai_tone),
      ai_tags: Array.isArray(debate.ai_tags) 
        ? debate.ai_tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      ai_key_points: parseKeyPoints(debate.ai_key_points),
      ai_topics: aiTopics,
      speaker_count: debate.speaker_count || 0,
      contribution_count: debate.contribution_count || 0,
      party_count: typeof debate.party_count === 'object' && debate.party_count 
        ? debate.party_count as PartyCount 
        : {},
      interest_score: debate.interest_score || 0,
      interest_factors: parseInterestFactors(debate.interest_factors),
      engagement_count: debate.engagement_count || 0,
      ai_question: debate.ai_question || '',
      ai_question_topic: debate.ai_question_topic || '',
      ai_question_ayes: debate.ai_question_ayes || 0,
      ai_question_noes: debate.ai_question_noes || 0,
      ai_comment_thread: parseCommentThread(debate.ai_comment_thread),
      divisions: Array.isArray(debate.divisions) 
        ? debate.divisions as Division[]
        : [],
      speakers: Array.isArray(debate.speakers) 
        ? debate.speakers.filter((speaker): speaker is string => typeof speaker === 'string')
        : [],
    };
  });

  return {
    items: processedItems,
    nextCursor
  };
}

export async function submitVote({ debate_id, vote }: DebateVote) {
  const supabase = getSupabase()
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) throw userError;
  if (!user) {
    throw new Error('Authentication required for voting');
  }

  try {
    const { data, error } = await supabase.rpc('submit_debate_vote', {
      p_debate_id: debate_id,
      p_vote: vote
    });

    if (error) throw error;

    // Invalidate relevant caches after successful vote
    await Promise.all([
      fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keys: [
            CACHE_KEYS.topicVoteStats.key(),
            CACHE_KEYS.userTopicVotes.key(user.id),
            CACHE_KEYS.demographicStats.key()
          ]
        })
      })
    ]);

    return data;
  } catch (error) {
    console.error('Vote submission error:', error);
    throw error;
  }
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

export async function getMPData(mpId: number): Promise<MPData | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('member_id', mpId)
    .is('house_end_date', null)
    .single();

  if (error) {
    console.error('Error fetching MP data:', error);
    return null;
  }

  return transformMPData(data);
}

// Add this type definition for the raw MP data
type RawMPData = {
  member_id: number;
  display_as: string;
  full_title: string;
  gender: string;
  party: string;
  constituency: string;
  house_start_date: string;
  constituency_country: string;
  twfy_image_url: string | null;
  email: string | null;
  age: number | null;
  department: string | null;
  ministerial_ranking: number | null;
  media: string | Record<string, unknown> | null;
};

function transformMPData(data: RawMPData): MPData {
  let parsedMedia = null;
  if (data.media) {
    try {
      parsedMedia = typeof data.media === 'string' 
        ? JSON.parse(data.media) 
        : data.media;
    } catch (e) {
      console.error('Error parsing media JSON:', e);
    }
  }

  // Transform constituency country codes to full names
  const countryMap: { [key: string]: string } = {
    'E': 'England',
    'W': 'Wales',
    'S': 'Scotland',
    'I': 'Northern Ireland'
  };

  return {
    ...data,
    media: parsedMedia,
    constituency_country: data.constituency_country 
      ? countryMap[data.constituency_country] || data.constituency_country
      : null
  };
}

export async function getMPKeyPoints(mpName: string, limit: number = 10): Promise<MPKeyPoint[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.rpc('get_mp_key_points', {
    p_mp_name: mpName,
    p_limit: limit
  });

  if (error) throw error;

  // Transform the data to ensure ai_topics is properly typed
  return (data || []).map((item: unknown) => {
    if (typeof item !== 'object' || !item) return {
      debate_id: '',
      debate_title: '',
      debate_date: '',
      point: '',
      point_type: 'made' as const,
      original_speaker: null,
      ai_topics: []
    };

    const mpPoint = item as Record<string, unknown>;
    return {
      ...mpPoint,
      ai_topics: Array.isArray(mpPoint.ai_topics) 
        ? mpPoint.ai_topics.map((topic: unknown) => {
            if (typeof topic !== 'object' || !topic) return {
              name: '',
              speakers: [],
              frequency: 1,
              subtopics: []
            };
            
            const t = topic as Record<string, unknown>;
            return {
              name: typeof t.name === 'string' ? t.name : '',
              speakers: Array.isArray(t.speakers) ? t.speakers : [],
              frequency: typeof t.frequency === 'number' ? t.frequency : 1,
              subtopics: Array.isArray(t.subtopics) ? t.subtopics : []
            };
          })
        : []
    };
  });
}

export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  
  try {
    // Generate a new verification token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_verification_token',
      { user_email: email }
    );

    if (tokenError) throw tokenError;
    if (!tokenData?.success) {
      throw new Error(tokenData?.error || 'Failed to generate verification token');
    }

    // Create confirmation link with the new token
    const encodedToken = encodeURIComponent(tokenData.confirmation_token);
    const confirmationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accounts/verify?token=${encodedToken}`;
    
    // Send the verification email
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

    return { success: true };
  } catch (error) {
    console.error('Resend verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend verification email'
    };
  }
};

// Add new functions after existing functions
export const getTopicVoteStats = async (): Promise<RawTopicStats> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_topic_vote_stats');
  
  if (error) throw error;
  return data as RawTopicStats;
};

export const getUserTopicVotes = async (): Promise<RawUserVotingStats> => {
  const supabase = getSupabase();
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

export const getDemographicVoteStats = async (
  debateId?: string,
  topic?: string,
  days: number = 14
): Promise<DemographicStats> => {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.rpc('get_demographic_vote_stats', {
    p_debate_id: debateId || null,
    p_topic: topic || null,
    p_days: days
  });

  if (error) throw error;
  return data as DemographicStats;
};

export const verifyEmail = async (token: string): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase.rpc('verify_user_email', {
      token
    });

    if (error) throw error;
    if (!data.success) {
      throw new Error(data.error || 'Verification failed');
    }

    // Send welcome email
    const welcomeResponse = await fetch('/api/auth/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        newsletter: data.newsletter
      }),
    });

    if (!welcomeResponse.ok) {
      console.error('Failed to send welcome email');
    }

    return { success: true };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify email'
    };
  }
};

export const migrateAnonymousVotes = async (votes: VoteData[]): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Authentication required');

    // Batch votes into groups of 10 to avoid overwhelming the server
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < votes.length; i += batchSize) {
      batches.push(votes.slice(i, i + batchSize));
    }

    // Process each batch sequentially
    for (const batch of batches) {
      const { error } = await supabase.rpc('migrate_anonymous_votes', {
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
