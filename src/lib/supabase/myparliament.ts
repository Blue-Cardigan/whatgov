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

// The shape of the speaker object in the JSONB
export interface KeyPointSpeaker {
  memberId: string;
  name: string;
  party: string;
  constituency: string;
  imageUrl?: string;
}

// The shape of each key point in the ai_key_points JSONB array
export interface KeyPoint {
  point: string;
  context?: string;
  speaker: KeyPointSpeaker;
  support: string[];
  opposition: string[];
}

// The shape of a grouped speaker with their points
export interface SpeakerPoints {
  speaker: {
    id: string;
    name: string;
    party: string;
    constituency: string;
    imageUrl?: string;
  };
  points: KeyPoint[];
}

// The shape of the materialized view row
export interface MPKeyPointDetails {
  debate_id: string;
  debate_ext_id: string;
  debate_title: string;
  debate_date: string;
  debate_type: string;
  debate_house: string;
  debate_location: string;
  parent_ext_id: string;
  parent_title: string;
  all_key_points: {
    point: string;
    context?: string;
    speaker: {
      memberId: string;
      name: string;
      party: string;
      constituency: string;
      imageUrl?: string;
    };
    support: string[];
    opposition: string[];
  }[];
  point: string;
  context: string | null;
  member_id: string;
  speaker_name: string;
  speaker_party: string;
  speaker_constituency: string;
  speaker_house: string;
  speaker_image_url: string | null;
  speaker_full_title: string;
  support: string[];
  opposition: string[];
  ai_topics: any[];
  ai_summary: string | null;
  interest_score: number;
}

export async function getMPKeyPointsById(
  mpId: number,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ data: MPKeyPointDetails[]; count: number }> {
  const supabase = createClient();
  const {
    limit = 50,
    offset = 0,
    startDate,
    endDate = new Date(),
  } = options;

  // Build query
  let query = supabase
    .from('mp_key_points')
    .select('*', { count: 'exact' })
    .eq('member_id', mpId.toString())
    .order('debate_date', { ascending: false })
    .range(offset, offset + limit - 1);

  // Add date filters if provided
  if (startDate) {
    query = query.gte('debate_date', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('debate_date', endDate.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching MP key points:', error);
    return { data: [], count: 0 };
  }

  return {
    data: data as MPKeyPointDetails[],
    count: count || 0
  };
}

// Add a function to get key points by topic
export async function getMPKeyPointsByTopic(
  mpId: number,
  topic: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: MPKeyPointDetails[]; count: number }> {
  const supabase = createClient();
  const { limit = 50, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from('mp_key_points')
    .select('*', { count: 'exact' })
    .eq('member_id', mpId.toString())
    .containedBy('ai_topics', [{ name: topic }])
    .order('debate_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching MP key points by topic:', error);
    return { data: [], count: 0 };
  }

  return {
    data: data as MPKeyPointDetails[],
    count: count || 0
  };
}

// Add a function to get recent key points across all MPs
export async function getRecentKeyPoints(
  options: {
    limit?: number;
    offset?: number;
    party?: string;
  } = {}
): Promise<{ data: MPKeyPointDetails[]; count: number }> {
  const supabase = createClient();
  const { limit = 50, offset = 0, party } = options;

  let query = supabase
    .from('mp_key_points')
    .select('*', { count: 'exact' })
    .order('debate_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (party) {
    query = query.eq('speaker_party', party);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching recent key points:', error);
    return { data: [], count: 0 };
  }

  return {
    data: data as MPKeyPointDetails[],
    count: count || 0
  };
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


// Add this new function to search MPs by name
export async function getMPKeyPointsByName(
  name: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: MPKeyPointDetails[]; count: number }> {
  const supabase = createClient();
  const { limit = 50, offset = 0 } = options;

  // Clean and normalize the search input
  // Remove extra spaces, handle quotes properly
  const cleanName = name
    .trim()
    .toLowerCase()
    // Handle quoted strings by temporarily replacing spaces
    .replace(/"([^"]+)"/g, (match, group) => group.replace(/\s+/g, '_SPACE_'))
    // Remove any remaining quotes
    .replace(/["']/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    // Restore spaces in quoted sections
    .replace(/_SPACE_/g, ' ');

  if (!cleanName) {
    return { data: [], count: 0 };
  }

  // Split into parts, preserving quoted phrases as single terms
  const nameParts = cleanName.split(' ').filter(Boolean);
  
  let query = supabase
    .from('mp_key_points')
    .select('*', { count: 'exact' })
    .order('debate_date', { ascending: false })
    .order('speaker_name')
    .range(offset, offset + limit - 1);

  // Build search conditions
  if (nameParts.length > 1) {
    // Search for exact phrase and individual terms
    const searchConditions = [
      `speaker_name.ilike.%${cleanName}%`,
      ...nameParts.map(part => `speaker_name.ilike.%${part}%`)
    ];
    
    // Handle special titles like "ms", "mr", "dr" etc.
    const titleParts = nameParts.filter(part => 
      ['ms', 'mrs', 'mr', 'dr', 'sir', 'dame'].includes(part)
    );
    const nonTitleParts = nameParts.filter(part => 
      !['ms', 'mrs', 'mr', 'dr', 'sir', 'dame'].includes(part)
    );
    
    if (titleParts.length > 0 && nonTitleParts.length > 0) {
      // Add combination of title + next part
      titleParts.forEach(title => {
        nonTitleParts.forEach(part => {
          searchConditions.push(`speaker_name.ilike.%${title} ${part}%`);
        });
      });
    }

    query = query.or(searchConditions.join(','));
  } else {
    query = query.ilike('speaker_name', `%${cleanName}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching MP key points by name:', error);
    return { data: [], count: 0 };
  }

  // Enhanced result sorting
  if (nameParts.length > 1) {
    const sortedData = data?.sort((a, b) => {
      const aName = a.speaker_name.toLowerCase();
      const bName = b.speaker_name.toLowerCase();
      
      // Exact matches first
      const aExact = aName.includes(cleanName);
      const bExact = bName.includes(cleanName);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then matches with all parts
      const aAllParts = nameParts.every(part => aName.includes(part));
      const bAllParts = nameParts.every(part => bName.includes(part));
      if (aAllParts && !bAllParts) return -1;
      if (!aAllParts && bAllParts) return 1;
      
      // Finally sort by date
      return new Date(b.debate_date).getTime() - new Date(a.debate_date).getTime();
    });

    return {
      data: sortedData as MPKeyPointDetails[],
      count: count || 0
    };
  }

  return {
    data: data as MPKeyPointDetails[],
    count: count || 0
  };
}