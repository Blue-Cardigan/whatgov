'use client'

import createClient from './client'
import type { FeedItem, FeedFilters, CommentThread, PartyCount, Division, Speaker, AiTopics, InterestFactors } from '@/types'
import type { Database, Json } from '@/types/supabase'
import { parseKeyPoints } from '../utils'

export type FeedCursor = {
  id: string
  date: string
  score: number
}

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
        ? debate.speakers.filter((speaker): speaker is Speaker => typeof speaker === 'object')
        : [],
    };
  });

  return {
    items: processedItems,
    nextCursor
  };
}

export async function getFeedItems(
  pageSize: number = 8,
  cursor?: FeedCursor,
  votedOnly: boolean = false,
  filters?: FeedFilters
): Promise<{ 
  items: FeedItem[]; 
  nextCursor?: FeedCursor 
}> {
  const supabase = createClient();
  
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