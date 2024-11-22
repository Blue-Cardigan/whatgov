import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';

export interface HansardApiConfig {
  format: 'json';
  house: 'Commons' | 'Lords';
  date?: string;
  section?: string;
}

interface SectionTreeItem {
  Id: number;
  Title: string;
  ParentId: number | null;
  SortOrder: number;
  ExternalId: string;
  HRSTag: string | null;
  HansardSection: string | null;
  Timecode: string | null;
}

export interface SearchParams {
  searchTerm?: string;
  house?: 'Commons' | 'Lords';
  startDate?: string;
  endDate?: string;
  date?: string;
  memberId?: number;
  skip?: number;
  take?: number;
  orderBy?: 'SittingDateAsc' | 'SittingDateDesc';
  spokenBy?: string;
  debateType?: string;
  topics?: string[];
  parties?: string[];
  outputType?: 'List' | 'Group';
}

export interface SearchResponse {
  TotalMembers: number;
  TotalContributions: number;
  TotalWrittenStatements: number;
  TotalWrittenAnswers: number;
  TotalCorrections: number;
  TotalPetitions: number;
  TotalDebates: number;
  TotalCommittees: number;
  TotalDivisions: number;
  SearchTerms: string[];
  Members: Member[];
  Contributions: Contribution[];
}

export interface Member {
  MemberId: number;
  MemberName: string;
  Party?: string;
  StartDate?: string;
  EndDate?: string;
  House?: 'Commons' | 'Lords';
  CurrentMember?: boolean;
}

export interface Contribution {
  MemberName: string;
  MemberId: number;
  AttributedTo: string;
  ItemId: number;
  ContributionExtId: string;
  ContributionText: string;
  HRSTag: string;
  HansardSection: string;
  Timecode: string | null;
  DebateSection: string;
  DebateSectionId: number;
  DebateSectionExtId: string;
  SittingDate: string;
  Section: string;
  House: string;
  OrderInDebateSection: number;
  DebateSectionOrder: number;
  Rank: number;
}

export interface MemberSearchResponse {
  Results: Member[];
  TotalResults: number;
  Skip: number;
  Take: number;
}

// Add new interface for oral questions
export interface OralQuestion {
  Id: number;
  QuestionText: string;
  AnsweringWhen: string;
  AnsweringBody: string;
  AnsweringMinisterTitle: string;
  AskingMember: {
    Name: string;
    Constituency: string;
    Party: string;
    PhotoUrl: string;
  };
  AnsweringMinister: {
    MnisId: number;
    PimsId: number;
    Name: string;
    ListAs: string;
    Constituency: string;
    Status: string;
    Party: string;
    PartyId: number;
    PartyColour: string;
    PhotoUrl: string;
  };
}

export interface OralQuestionsResponse {
  Success: boolean;
  Response: OralQuestion[];
  PagingInfo?: {
    Skip: number;
    Take: number;
    Total: number;
  };
}

interface TopicsResponse {
  topics: string[];
}

export class HansardAPI {
  private static async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const fullUrl = url.startsWith('http') ? url : url;
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  private static async fetchWithCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await getRedisValue<T>(cacheKey);
      if (cached) {
        return cached; // Already deserialized thanks to automaticDeserialization
      }

      // If not in cache, fetch fresh data
      const data = await fetcher();

      // Store in cache (only if we got valid data)
      if (data) {
        // Use server action to set cache
        await setRedisValue(cacheKey, data, ttl);
      }

      return data;
    } catch (error) {
      console.error(`Cache operation failed for key ${cacheKey}:`, error);
      // Fallback to direct fetch on cache error
      return fetcher();
    }
  }

  static async fetchSectionTrees(config: HansardApiConfig) {
    const url = `${HANSARD_API_BASE}/overview/sectiontrees.${config.format}?` + 
      new URLSearchParams({
        house: config.house,
        date: config.date!,
        section: config.section!,
      });

    return this.fetchWithErrorHandling(url);
  }

  static async fetchDebate(debateSectionExtId: string) {
    const url = `${HANSARD_API_BASE}/debates/debate/${debateSectionExtId}.json`;
    return this.fetchWithErrorHandling(url);
  }

  static async fetchSpeakers(debateSectionExtId: string) {
    const url = `${HANSARD_API_BASE}/debates/speakerslist/${debateSectionExtId}.json`;
    return this.fetchWithErrorHandling(url);
  }

  static async getLastSittingDate(house?: 'Commons' | 'Lords'): Promise<string> {
    if (house) {
      const url = `${HANSARD_API_BASE}/overview/lastsittingdate.json?` +
        new URLSearchParams({ house });
      const response = await this.fetchWithErrorHandling(url);
      return response as string;
    }

    // Fetch both houses in parallel
    const [commonsDate, lordsDate] = await Promise.all([
      this.getLastSittingDate('Commons'),
      this.getLastSittingDate('Lords')
    ]);

    // Return the most recent date
    return new Date(commonsDate) > new Date(lordsDate) ? commonsDate : lordsDate;
  }

  static async getDebatesList(date?: string, house: 'Commons' | 'Lords' = 'Commons') {
    const targetDate = date || await this.getLastSittingDate();
    const cacheKey = `hansard:debates:${house}:${targetDate}`;

    return this.fetchWithCache(
      cacheKey,
      async () => {
        try {
          const data = await this.fetchSectionTrees({
            format: 'json',
            house,
            date: targetDate,
            section: 'Debate'
          });

          if (!Array.isArray(data)) {
            console.error('Unexpected data format:', data);
            return [];
          }

          const sectionTreeItems = data[0]?.SectionTreeItems || [];
          
          return sectionTreeItems.filter((item: SectionTreeItem) => 
            item.HRSTag?.includes('Question') || 
            item.HRSTag?.includes('Debate') ||
            item.HRSTag?.includes('Motion') ||
            item.HRSTag?.includes('UrgentQuestion')
          );
        } catch (error) {
          console.error('Failed to get debates list:', error);
          return [];
        }
      },
      1800 // Cache for 30 minutes
    );
  }

  static async getDebateDetails(debateSectionExtId: string) {
    const cacheKey = `hansard:debate:${debateSectionExtId}`;
    
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const [debate, speakers, { data: generated, error: dbError }] = await Promise.all([
          this.fetchDebate(debateSectionExtId),
          this.fetchSpeakers(debateSectionExtId),
          supabase
            .from('debate_generated_content')
            .select('*')
            .eq('debate_section_ext_id', debateSectionExtId)
        ]);

        if (dbError) throw dbError;

        return { 
          debate, 
          speakers, 
          generated: generated || [] 
        };
      },
      3600 // Cache debates for 1 hour as they don't change often
    );
  }

  static async search(params: SearchParams): Promise<SearchResponse> {
    try {
      // Construct search parameters differently to match API expectations
      const searchParams = new URLSearchParams();
      
      if (params.searchTerm) {
        searchParams.append('searchTerm', params.searchTerm);
      }
      if (params.house) {
        searchParams.append('house', params.house);
      }
      if (params.date) {
        searchParams.append('date', params.date);
      }
      // Add other parameters as needed

      const url = `/api/hansard/search?${searchParams.toString()}`;
      return await this.fetchWithErrorHandling(url);
    } catch (error) {
      console.error('Search failed:', error);
      return {
        TotalMembers: 0,
        TotalContributions: 0,
        TotalWrittenStatements: 0,
        TotalWrittenAnswers: 0,
        TotalCorrections: 0,
        TotalPetitions: 0,
        TotalDebates: 0,
        TotalCommittees: 0,
        TotalDivisions: 0,
        SearchTerms: [],
        Members: [],
        Contributions: []
      };
    }
  }

  static async searchWithFilters(params: SearchParams): Promise<SearchResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      // Construct search term with proper ordering
      const searchParts: string[] = [];
      
      // Base search term comes first
      if (params.searchTerm?.trim()) {
        searchParts.push(params.searchTerm);
      }
      
      // Directives come after
      if (params.spokenBy) {
        const quotedValue = params.spokenBy.includes(' ') 
          ? `"${params.spokenBy}"` 
          : params.spokenBy;
        searchParts.push(`spokenby:${quotedValue}`);
      }
      if (params.debateType) {
        const quotedValue = params.debateType.includes(' ') 
          ? `"${params.debateType}"` 
          : params.debateType;
        searchParts.push(`debate:${quotedValue}`);
      }
      
      // Always add searchTerm parameter even if empty array
      const searchTermValue = searchParts.join(' AND ');
      searchParams.append('searchTerm', searchTermValue);
      
      // Add documented parameters
      if (params.house) searchParams.append('house', params.house);
      if (params.date) searchParams.append('date', params.date);
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
      if (params.take !== undefined) searchParams.append('take', params.take.toString());
      if (params.orderBy) searchParams.append('orderBy', params.orderBy);
      
      const url = `/api/hansard/search?${searchParams.toString()}`;
      return await this.fetchWithErrorHandling(url);
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  static async getTopics(): Promise<string[]> {
    try {
      const response = await this.fetchWithErrorHandling<TopicsResponse>(
        '/api/hansard/search?format=json&outputType=Group'
      );
      return response.topics || [];
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      return [];
    }
  }

  static async getParties(): Promise<string[]> {
    try {
      // Note: Parties endpoint not documented - might need to use member search with aggregation
      const response = await this.fetchWithErrorHandling<MemberSearchResponse>('/api/hansard/search/members?format=json');
      const parties = new Set(response.Results?.map((member: Member) => member.Party).filter(Boolean));
      return Array.from(parties) as string[];
    } catch (error) {
      console.error('Failed to fetch parties:', error);
      return [];
    }
  }

  static async searchMembers(searchTerm: string): Promise<Member[]> {
    try {
      const params = new URLSearchParams({
        format: 'json',
        searchTerm: searchTerm
      });
      const response = await this.fetchWithErrorHandling<MemberSearchResponse>(
        `/api/hansard/search/members?${params.toString()}`
      );
      return response.Results || [];
    } catch (error) {
      console.error('Failed to search members:', error);
      return [];
    }
  }

  static async getUpcomingOralQuestions(forNextWeek: boolean = false): Promise<OralQuestion[]> {
    const today = new Date();
    const cacheKey = `hansard:oral-questions:${forNextWeek ? 'next' : 'current'}:${format(today, 'yyyy-MM-dd')}`;
    
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const questions = await this.fetchQuestionsForWeek(today, forNextWeek);
        return questions;
      },
      // Cache for 5 minutes normally, but longer (30 mins) for next week's data
      forNextWeek ? 1800 : 300
    );
  }

  private static async fetchQuestionsForWeek(
    baseDate: Date,
    forNextWeek: boolean
  ): Promise<OralQuestion[]> {
    const weekStart = new Date(baseDate);
    const weekEnd = new Date(baseDate);
    
    if (forNextWeek) {
      // For next week, get next Monday through Friday
      const daysUntilNextMonday = (8 - baseDate.getDay()) % 7;
      weekStart.setDate(baseDate.getDate() + daysUntilNextMonday);
      weekEnd.setDate(weekStart.getDate() + 4); // Monday + 4 = Friday
    } else {
      // For current week, start from today and go until Friday
      weekEnd.setDate(weekStart.getDate() + (5 - weekStart.getDay())); // Set to this Friday
    }
    
    // If it's weekend, return empty array for current week
    if (!forNextWeek && (baseDate.getDay() === 0 || baseDate.getDay() === 6)) {
      return [];
    }
    
    return await this.fetchOralQuestions(weekStart, weekEnd);
  }

  private static async fetchOralQuestions(
    startDate: Date,
    endDate: Date
  ): Promise<OralQuestion[]> {
    const params = new URLSearchParams({
      answeringDateStart: format(startDate, 'yyyy-MM-dd'),
      answeringDateEnd: format(endDate, 'yyyy-MM-dd')
    });

    const response = await this.fetchWithErrorHandling<OralQuestionsResponse>(
      `/api/hansard/questions?${params.toString()}`
    );
    
    if (!response.Success) {
      console.error('Failed to fetch oral questions:', response);
      return [];
    }

    return response.Response || [];
  }

  // Helper method to generate consistent cache keys
  private static getCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return ['hansard', prefix, ...parts].filter(Boolean).join(':');
  }
}