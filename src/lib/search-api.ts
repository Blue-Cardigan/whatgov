import { getRedisValue, setRedisValue } from '@/app/actions/redis';
import type { Member, MemberSearchResponse, SearchResponse } from '@/types/search';
import type { FetchOptions } from '@/types';
import type { SearchParams } from '@/types/search';
import { HansardDebateResponse } from '@/types/hansard';

export const HANSARD_API_BASE = process.env.HANSARD_API_BASE || 'https://hansard-api.parliament.uk';

export function constructSearchUrl(params: SearchParams): string {
  const searchParams = new URLSearchParams();
  
  // Handle advanced search parameters
  if (params.searchTerm) {
    // The searchTerm will already be formatted with the correct directives
    // from the QueryBuilder's constructSearchQuery method
    searchParams.append('queryParameters.searchTerm', params.searchTerm);
  }
  
  // Add other parameters
  if (params.house) {
    searchParams.append('queryParameters.house', params.house);
  }

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

  static async search(params: SearchParams): Promise<SearchResponse> {
    const url = constructSearchUrl(params);
    const cacheKey = `search:${url}:ai='0'}`;

    try {
      const cachedResult = await this.fetchWithCache<SearchResponse>(
        cacheKey,
        async () => {
          const searchResults = await this.fetchWithErrorHandling<SearchResponse>(url);

          return {
            ...searchResults,
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
