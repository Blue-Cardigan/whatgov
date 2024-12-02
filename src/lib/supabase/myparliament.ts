'use client'

import createClient from './client'
import type { MPData, MPKeyPoint } from '@/types'
import type { DemographicStats } from '@/types/VoteStats'

type RawMPData = {
  member_id: number
  display_as: string
  full_title: string
  gender: string
  party: string
  constituency: string
  house_start_date: string
  constituency_country: string
  twfy_image_url: string | null
  email: string | null
  age: number | null
  department: string | null
  ministerial_ranking: number | null
  media: string | Record<string, unknown> | null
}

export async function lookupPostcode(postcode: string) {
  const supabase = createClient();
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
  const supabase = createClient();
  
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

export async function getMPKeyPoints(
  mpName: string, 
  limit: number = 10
): Promise<MPKeyPoint[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_mp_key_points', {
    p_mp_name: mpName,
    p_limit: limit
  });

  if (error) throw error;

  // Transform and validate the data
  return (data || []).map((item: unknown) => {
    // Basic validation of the item
    if (!item || typeof item !== 'object') {
      console.error('Invalid key point item:', item);
      return createEmptyKeyPoint();
    }

    const keyPoint = item as Record<string, unknown>;

    // Validate required string fields
    const requiredStrings = ['debate_id', 'ext_id', 'debate_title', 'point', 'point_type'] as const;
    for (const field of requiredStrings) {
      if (typeof keyPoint[field] !== 'string') {
        console.error(`Invalid ${field} in key point:`, keyPoint);
        return createEmptyKeyPoint();
      }
    }

    // Validate date
    if (!(keyPoint.debate_date instanceof Date) && typeof keyPoint.debate_date !== 'string') {
      console.error('Invalid debate_date in key point:', keyPoint);
      return createEmptyKeyPoint();
    }

    // Transform AI topics
    const aiTopics = Array.isArray(keyPoint.ai_topics) 
      ? keyPoint.ai_topics.map(transformTopic).filter(Boolean)
      : [];

    return {
      debate_id: keyPoint.debate_id as string,
      ext_id: keyPoint.ext_id as string,
      debate_title: keyPoint.debate_title as string,
      debate_date: keyPoint.debate_date as string,
      point: keyPoint.point as string,
      point_type: keyPoint.point_type as 'made' | 'supported' | 'opposed',
      original_speaker: typeof keyPoint.original_speaker === 'string' 
        ? keyPoint.original_speaker 
        : null,
      ai_topics: aiTopics
    };
  });
}

export const getDemographicVoteStats = async (
  debateId?: string,
  topic?: string,
  days: number = 14
): Promise<DemographicStats> => {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_demographic_vote_stats', {
    p_debate_id: debateId || null,
    p_topic: topic || null,
    p_days: days
  });

  if (error) throw error;
  return data as DemographicStats;
};

// Helper function for MP data transformation
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

// Helper functions
function createEmptyKeyPoint(): MPKeyPoint {
  return {
    debate_id: '',
    ext_id: '',
    debate_title: '',
    debate_date: new Date().toISOString(),
    point: '',
    point_type: 'made',
    original_speaker: null,
    ai_topics: []
  };
}

function transformTopic(topic: unknown) {
  if (!topic || typeof topic !== 'object') {
    return null;
  }

  const t = topic as Record<string, unknown>;
  
  return {
    name: typeof t.name === 'string' ? t.name : '',
    speakers: Array.isArray(t.speakers) ? t.speakers : [],
    frequency: typeof t.frequency === 'number' ? t.frequency : 1,
    subtopics: Array.isArray(t.subtopics) ? t.subtopics : []
  };
}