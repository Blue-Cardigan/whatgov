import { format } from 'date-fns';
import type { OralQuestion, OralQuestionsResponse } from '@/types/questions';
import type { FetchOptions } from '@/types';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';

export class QuestionsApi {
  static readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  static readonly NEXT_WEEK_CACHE_TTL = 1800; // 30 minutes
  static readonly MAX_RETRIES = 2;

  static async getUpcomingOralQuestions(
    forNextWeek: boolean = false,
    options: FetchOptions = {}
  ): Promise<OralQuestion[]> {
    const today = new Date();
    const cacheKey = `hansard:oral-questions:${forNextWeek ? 'next' : 'current'}:${format(today, 'yyyy-MM-dd')}`;
        
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const questions = await this.fetchQuestionsForWeek(today, forNextWeek);
        return this.validateAndProcessQuestions(questions);
      },
      {
        ...options,
        cacheTTL: forNextWeek ? this.NEXT_WEEK_CACHE_TTL : this.DEFAULT_CACHE_TTL
      }
    );
  }

  private static validateAndProcessQuestions(
    questions: OralQuestion[]
  ): OralQuestion[] {
    if (!Array.isArray(questions)) {
      console.error('Invalid questions data received:', questions);
      return [];
    }

    // Filter out invalid questions and sort by date
    return questions
      .filter(q => 
        q.QuestionText && 
        q.AnsweringWhen && 
        q.AnsweringBody && 
        q.AskingMember
      )
      .sort((a, b) => 
        new Date(a.AnsweringWhen).getTime() - new Date(b.AnsweringWhen).getTime()
      );
  }

  private static async fetchQuestionsForWeek(
    baseDate: Date,
    forNextWeek: boolean
  ): Promise<OralQuestion[]> {
    const { weekStart, weekEnd } = this.calculateWeekDates(baseDate, forNextWeek);
    
    // If it's weekend and current week is requested, return empty array
    if (!forNextWeek && this.isWeekend(baseDate)) {
      return [];
    }
    
    return await this.fetchOralQuestions(weekStart, weekEnd);
  }

  private static calculateWeekDates(baseDate: Date, forNextWeek: boolean) {
    // Create new date objects to avoid mutating the input
    const today = new Date(baseDate);
    const weekStart = new Date(today);
    let weekEnd = new Date(today);

    // Reset time to start of day to avoid timezone issues
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    if (forNextWeek) {
      // Always get next week's Monday-Friday
      const daysUntilNextMonday = (8 - currentDay) % 7 || 7;
      weekStart.setDate(today.getDate() + daysUntilNextMonday);
    } else {
      // For current week
      if (currentDay === 0 || currentDay === 6) {
        // If weekend, get next week
        const daysUntilNextMonday = currentDay === 0 ? 1 : 2;
        weekStart.setDate(today.getDate() + daysUntilNextMonday);
      } else {
        // Get this week's Monday
        const daysToMonday = currentDay - 1;
        weekStart.setDate(today.getDate() - daysToMonday);
      }
    }

    // Set end date to Friday of the week
    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);

    return { weekStart, weekEnd };
  }

  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private static async fetchOralQuestions(
    startDate: Date,
    endDate: Date
  ): Promise<OralQuestion[]> {
    const params = new URLSearchParams({
      'answeringDateStart': format(startDate, 'yyyy-MM-dd'),
      'answeringDateEnd': format(endDate, 'yyyy-MM-dd')
    });

    // Use our backend API route instead of direct API access
    const response = await this.fetchWithErrorHandling<OralQuestionsResponse>(
      `/api/hansard/questions?${params.toString()}`
    );
    
    if (!response.Success) {
      console.error('Failed to fetch oral questions:', response);
      return [];
    }

    return response.Response || [];
  }

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
}