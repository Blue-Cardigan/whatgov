'use client'

import createClient from './client'
import type { MPData } from '@/types'
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
  ai_topics: Array<{
    name: string;
    speakers: Array<{
      name: string;
      party: string;
      memberId: string;
      frequency: number;
      subtopics: string[];
      constituency: string;
    }>;
    frequency: number;
  }>;
  ai_summary: string | null;
  interest_score: number;
}

export async function searchMembers(query: string): Promise<{
  member_id: number;
  display_as: string;
  party: string;
  constituency: string;
  department: string | null;
}[]> {
  const supabase = createClient();
  
  // Return empty array if query is less than 2 characters
  if (query.length < 2) return [];

  const cleanQuery = query
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s+/g, ' '); // Normalize whitespace

  const { data, error } = await supabase
    .from('members')
    .select('member_id, display_as, party, constituency, department')
    .is('house_end_date', null)
    .or(`display_as.ilike.%${cleanQuery}%, department.ilike.%${cleanQuery}%`)
    .order('display_as')
    .limit(10);

  if (error) {
    console.error('Error searching members:', error);
    return [];
  }

  return data || [];
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

export async function getMPData(identifier: string | number): Promise<MPData | null> {
  const supabase = createClient();
  
  let query = supabase
    .from('members')
    .select('*')
    .is('house_end_date', null);

  // If identifier is a number or looks like a number, treat as member_id
  if (typeof identifier === 'number' || /^\d+$/.test(identifier.toString())) {
    query = query.eq('member_id', identifier);
  } else {
    // Clean and normalize the name search
    const cleanName = identifier
      .toString()
      .trim()
      .toLowerCase()
      .replace(/"([^"]+)"/g, (group) => group.replace(/\s+/g, '_SPACE_'))
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ')
      .replace(/_SPACE_/g, ' ');

    const nameParts = cleanName.split(' ').filter(Boolean);

    if (nameParts.length > 1) {
      // Search for combinations of name parts
      const searchConditions = [
        `display_as.ilike.%${cleanName}%`,
        `full_title.ilike.%${cleanName}%`
      ];

      // Handle titles (Sir, Dame, Dr, etc.)
      const titleParts = nameParts.filter(part => 
        ['ms', 'mrs', 'mr', 'dr', 'sir', 'dame'].includes(part)
      );
      const nonTitleParts = nameParts.filter(part => 
        !['ms', 'mrs', 'mr', 'dr', 'sir', 'dame'].includes(part)
      );

      if (titleParts.length > 0 && nonTitleParts.length > 0) {
        titleParts.forEach(title => {
          nonTitleParts.forEach(part => {
            searchConditions.push(`display_as.ilike.%${title} ${part}%`);
            searchConditions.push(`full_title.ilike.%${title} ${part}%`);
          });
        });
      }

      query = query.or(searchConditions.join(','));
    } else {
      query = query.or(`display_as.ilike.%${cleanName}%,full_title.ilike.%${cleanName}%`);
    }
  }

  // Get all matching results
  const { data, error } = await query;

  if (error) {
    console.error('Error fetching MP data:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Sort and select the best match
  const sortedData = data.sort((a, b) => {
    // Prefer Commons members over Lords
    if (a.house === 'Commons' && b.house !== 'Commons') return -1;
    if (b.house === 'Commons' && a.house !== 'Commons') return 1;

    // If searching by name, prefer exact matches
    if (typeof identifier === 'string') {
      const cleanName = identifier.toLowerCase();
      const aNameMatch = a.display_as.toLowerCase().includes(cleanName);
      const bNameMatch = b.display_as.toLowerCase().includes(cleanName);
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
    }

    // Prefer ministers
    if (a.ministerial_ranking && !b.ministerial_ranking) return -1;
    if (!a.ministerial_ranking && b.ministerial_ranking) return 1;

    // Sort by most recently joined
    return new Date(b.house_start_date).getTime() - new Date(a.house_start_date).getTime();
  });

  return transformMPData(sortedData[0]);
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
  ai_topics: Array<{
    name: string;
    speakers: Array<{
      name: string;
      party: string;
      memberId: string;
      frequency: number;
      subtopics: string[];
      constituency: string;
    }>;
    frequency: number;
  }>;
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
  identifier: string | number,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: MPKeyPointDetails[]; count: number }> {
  const supabase = createClient();
  const { limit = 50, offset = 0 } = options;

  let query = supabase
    .from('mp_key_points')
    .select('*', { count: 'exact' })
    .order('debate_date', { ascending: false });

  // If identifier is a number or looks like a number, treat as member_id
  if (typeof identifier === 'number' || /^\d+$/.test(identifier.toString())) {
    query = query.eq('member_id', identifier.toString());
  } else {
    // Clean and normalize the name search
    const cleanName = identifier
      .toString()
      .trim()
      .toLowerCase()
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ');

    query = query.ilike('speaker_name', `%${cleanName}%`);
  }

  // Add pagination
  query = query.range(offset, offset + limit - 1);

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