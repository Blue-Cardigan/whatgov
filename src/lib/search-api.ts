import { getRedisValue, setRedisValue } from '@/app/actions/redis';
import type { Member, MemberSearchResponse, SearchResponse } from '@/types/search';
import getSupabase from '@/lib/supabase/client';
import { parseKeyPoints } from '@/lib/utils';
import type { FetchOptions, KeyPoint } from '@/types';
import type { SearchResultAIContent } from '@/types/search';
import type { SearchParams } from '@/types/search';
import type { HansardDebateResponse } from '@/types/hansard';

export const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';

// Add this new helper function
export function constructSearchUrl(params: SearchParams): string {
  const searchParams = new URLSearchParams();
  
  // Add each parameter with the correct prefix
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Skip the house parameter if both houses are selected
      if (key === 'house' && value === 'Commons,Lords') {
        return;
      }
      
      // Handle arrays specially (like memberIds)
      if (Array.isArray(value)) {
        value.forEach(item => {
          searchParams.append(`queryParameters.${key}`, item.toString());
        });
      } else {
        searchParams.append(`queryParameters.${key}`, value.toString());
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/hansard/search?${searchParams.toString()}`;
}

export class HansardAPI {
  // Add constants for better maintainability
  private static readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private static readonly MAX_RETRIES = 2;

  private static async fetchWithErrorHandling<T>(
    url: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { retries = this.MAX_RETRIES } = options;
    let lastError: Error = new Error('Unknown error occurred');
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data) {
          throw new Error('Invalid API response structure');
        }
        
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === retries) break;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    console.error('API fetch error after retries:', lastError);
    throw lastError;
  }

  private static async fetchWithCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options: FetchOptions = {}
  ): Promise<T> {
    const { 
      cacheTTL = this.DEFAULT_CACHE_TTL,
      forceRefresh = false 
    } = options;

    try {
      // Skip cache if forceRefresh is true
      if (!forceRefresh) {
        const cached = await getRedisValue<T>(cacheKey);
        if (cached) return cached;
      }

      const data = await fetcher();

      // Only cache valid data
      if (data && Object.keys(data).length > 0) {
        await setRedisValue(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`Cache operation failed for key ${cacheKey}:`, error);
      // Fallback to direct fetch on cache error
      return fetcher();
    }
  }

  private static async fetchAIContent(externalIds: string[], enableAI: boolean = false): Promise<Record<string, SearchResultAIContent>> {
    // Return empty object if AI is not enabled
    if (!enableAI) return {};

    const supabase = getSupabase();
    const results: Record<string, SearchResultAIContent> = {};
    
    try {
      const { data, error } = await supabase
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
          ai_key_points,
          speaker_count,
          party_count,
          speakers
        `)
        .in('ext_id', externalIds.map(id => id.toUpperCase()));

      if (error) throw error;

      data?.forEach((item: SearchResultAIContent) => {
        // Convert KeyPoint[] to Json before parsing
        const keyPoints = item.ai_key_points ? parseKeyPoints(JSON.parse(JSON.stringify(item.ai_key_points))) : undefined;
        
        results[item.ext_id] = {
          id: item.id,
          ext_id: item.ext_id,
          title: item.title,
          ai_title: item.ai_title || undefined,
          date: item.date,
          type: item.type,
          house: item.house,
          location: item.location,
          ai_summary: item.ai_summary || undefined,
          ai_key_points: keyPoints,
          speaker_count: item.speaker_count || undefined,
          party_count: item.party_count || undefined,
          speakers: item.speakers || undefined
        };
      });

      return results;
    } catch (error) {
      console.error('Failed to fetch AI content:', error);
      return results;
    }
  }

  static async search(params: SearchParams): Promise<SearchResponse & { aiContent?: Record<string, SearchResultAIContent> }> {
    const url = constructSearchUrl(params);
    const cacheKey = `search:${url}:ai=${params.enableAI ? '1' : '0'}`;

    try {
      const cachedResult = await this.fetchWithCache<SearchResponse & { aiContent?: Record<string, SearchResultAIContent> }>(
        cacheKey,
        async () => {
          const searchResults = await this.fetchWithErrorHandling<SearchResponse>(url);
          
          const debateIds = Array.from(
            new Set(
              searchResults.Contributions?.map(c => c.DebateSectionExtId) || []
            )
          );

          const aiContent = await this.fetchAIContent(debateIds, params.enableAI);

          return {
            ...searchResults,
            aiContent: params.enableAI ? aiContent : undefined
          };
        },
        {
          cacheTTL: this.DEFAULT_CACHE_TTL
        }
      );

      return cachedResult;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  static async searchMembers(searchTerm: string): Promise<Member[]> {
    try {
      const params = new URLSearchParams({
        format: 'json',
        searchTerm: searchTerm
      });
      const response = await this.fetchWithErrorHandling<MemberSearchResponse>(
        `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/hansard/search/members?${params.toString()}`
      );
      return response.Results || [];
    } catch (error) {
      console.error('Failed to search members:', error);
      return [];
    }
  }

  static async getSearchResultAIContent(externalId: string): Promise<SearchResultAIContent | null> {
    const supabase = getSupabase();
    
  try {
    const formattedExtId = externalId.toUpperCase();
    
    const { data, error } = await supabase
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
        ai_key_points,
        speaker_count,
        party_count,
        speakers
      `)
      .eq('ext_id', formattedExtId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching debate content:', error);
      return null;
    }
    const keyPoints = data.ai_key_points ? parseKeyPoints(data.ai_key_points) : undefined;

    return {
      id: data.id,
      ext_id: data.ext_id,
      title: data.title,
      ai_title: data.ai_title || undefined,
      date: data.date,
      type: data.type,
      house: data.house,
      location: data.location,
      ai_summary: data.ai_summary || undefined,
      ai_key_points: keyPoints,
      speaker_count: data.speaker_count || undefined,
      party_count: data.party_count || undefined,
      speakers: data.speakers || undefined
    };
  } catch (error) {
    console.error('Failed to fetch debate content:', error);
      return null;
    }
  }

  static async getDebateTranscript(extId: string): Promise<HansardDebateResponse | undefined> {
    try {
      const hansardUrl = `${HANSARD_API_BASE}/debates/debate/${extId}.json`;
      
      const response = await fetch(hansardUrl, {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        throw new Error(`Hansard API returned ${response.status}`);
      }

      // Ensure we properly consume the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream available');
      }

      // Read all chunks
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Concatenate chunks and decode
      const decoder = new TextDecoder();
      const text = decoder.decode(new Uint8Array(Buffer.concat(chunks)));
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to fetch debate transcript:', error);
      return undefined;
    }
  }
}