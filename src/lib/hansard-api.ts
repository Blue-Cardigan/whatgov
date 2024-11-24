import { format } from 'date-fns';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';

export const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';

export interface HansardApiConfig {
  format: 'json';
  house: 'Commons' | 'Lords';
  date?: string;
  section?: string;
}

export interface SearchParams {
  searchTerm?: string;
  house: 'Commons' | 'Lords';
  outputType: 'List' | 'Group';
  timelineGroupingSize?: 'Day' | 'Month' | 'Year';
  orderBy?: 'SittingDateAsc' | 'SittingDateDesc';
  debateType?: 'debate' | 'statement' | 'answer' | 'petition';
  department?: string;
  committeeTitle?: string;
  committeeType?: 1 | 2 | 3 | 4;
  includeCommitteeDivisions: boolean;
  includeFormer: boolean;
  includeCurrent: boolean;
  withDivision: boolean;
  startDate?: string;
  endDate?: string;
  spokenBy?: string;
  memberId?: number;
  memberIds?: number[];
  divisionId?: number;
  hansardIdentifier?: string;
  seriesNumber?: number;
  volumeNumber?: number;
  columnNumber?: string;
  section?: number;
  debateSectionId?: number;
  skip?: number;
  take?: number;
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

// Add this new helper function
export function constructSearchUrl(params: SearchParams): string {
  const searchParams = new URLSearchParams();
  
  // Add each parameter with the correct prefix
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
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

  return `/api/hansard/search?${searchParams.toString()}`;
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

  static async search(params: SearchParams): Promise<SearchResponse> {
    const url = constructSearchUrl(params);
    return this.fetchWithErrorHandling<SearchResponse>(url);
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