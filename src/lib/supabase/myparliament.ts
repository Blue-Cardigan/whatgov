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