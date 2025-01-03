import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import type { 
  PublishedEarlyDayMotion, 
  PublishedOralQuestion, 
  PublishedOralQuestionTime,
  HansardData,
  TimeSlot,
  DaySchedule,
} from '@/types/calendar';
import type { FetchOptions } from '@/types';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';

export class CalendarApi {
  static readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  static readonly NEXT_WEEK_CACHE_TTL = 1800; // 30 minutes
  static readonly MAX_RETRIES = 2;

  static async getWeeklyEvents(
    forNextWeek: boolean = false,
    options: FetchOptions = {}
  ): Promise<HansardData> {
    const today = new Date();
    const cacheKey = `hansard:calendar:${forNextWeek ? 'next' : 'current'}:${format(today, 'yyyy-MM-dd')}`;
        
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const { weekStart, weekEnd } = this.calculateWeekDates(today, forNextWeek);
        
        // If it's weekend and current week is requested, return empty data
        if (!forNextWeek && this.isWeekend(today)) {
          return this.getEmptyHansardData();
        }
        
        return this.fetchHansardData(weekStart, weekEnd);
      },
      {
        ...options,
        cacheTTL: forNextWeek ? this.NEXT_WEEK_CACHE_TTL : this.DEFAULT_CACHE_TTL
      }
    );
  }

  static async getMonthlyEvents(date: Date): Promise<HansardData> {
    const cacheKey = `hansard:calendar:month:${format(date, 'yyyy-MM')}`;
    
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return this.fetchHansardData(monthStart, monthEnd);
      },
      { cacheTTL: this.DEFAULT_CACHE_TTL }
    );
  }

  static async getDailyEvents(date: Date): Promise<HansardData> {
    const cacheKey = `hansard:calendar:day:${format(date, 'yyyy-MM-dd')}`;
    
    return this.fetchWithCache(
      cacheKey,
      async () => this.fetchHansardData(date, date),
      { cacheTTL: this.DEFAULT_CACHE_TTL }
    );
  }

  private static async fetchHansardData(
    startDate: Date,
    endDate: Date
  ): Promise<HansardData> {
    let allData: HansardData = {
      earlyDayMotions: [],
      oralQuestions: [],
      questionTimes: []
    };

    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        'dateStart': format(startDate, 'yyyy-MM-dd'),
        'dateEnd': format(endDate, 'yyyy-MM-dd'),
        'skip': skip.toString()
      });

      try {
        const response = await this.fetchWithErrorHandling<{
          earlyDayMotions: PublishedEarlyDayMotion[];
          oralQuestions: PublishedOralQuestion[];
          questionTimes: PublishedOralQuestionTime[];
        }>(`/api/hansard/questions?${params.toString()}`);

        console.log(response);

        // Merge new data with existing data
        allData.earlyDayMotions = [...allData.earlyDayMotions, ...(response.earlyDayMotions || [])];
        allData.oralQuestions = [...allData.oralQuestions, ...(response.oralQuestions || [])];
        allData.questionTimes = [...allData.questionTimes, ...(response.questionTimes || [])];

        // Check if we received a full page of results
        const hasFullPage = 
          response.earlyDayMotions?.length === 40 ||
          response.oralQuestions?.length === 40 ||
          response.questionTimes?.length === 40;

        if (!hasFullPage) {
          hasMore = false;
        } else {
          skip += 40;
        }
      } catch (error) {
        console.error('Error fetching Hansard data page:', error);
        hasMore = false;
      }
    }

    return {
      oralQuestions: this.validateAndProcessQuestions(allData.oralQuestions),
      earlyDayMotions: this.validateAndProcessEDMs(allData.earlyDayMotions),
      questionTimes: this.validateAndProcessTimes(allData.questionTimes)
    };
  }

  private static getEmptyHansardData(): HansardData {
    return {
      oralQuestions: [],
      earlyDayMotions: [],
      questionTimes: []
    };
  }

  private static validateAndProcessQuestions(
    questions: PublishedOralQuestion[]
  ): PublishedOralQuestion[] {
    if (!Array.isArray(questions)) return [];

    return questions
      .filter(q => 
        q.QuestionText && 
        q.AnsweringWhen && 
        q.AnsweringBody && 
        q.AskingMember
      )
      .map(q => ({
        ...q,
        AnsweringWhen: new Date(q.AnsweringWhen).toISOString()
      }))
      .sort((a, b) => 
        new Date(a.AnsweringWhen).getTime() - new Date(b.AnsweringWhen).getTime()
      );
  }

  private static validateAndProcessEDMs(
    edms: PublishedEarlyDayMotion[]
  ): PublishedEarlyDayMotion[] {
    if (!Array.isArray(edms)) return [];

    return edms
      .filter(edm => 
        edm.Title && 
        edm.DateTabled && 
        edm.PrimarySponsor
      )
      .map(edm => ({
        ...edm,
        // Compare Status with string values instead of number
        Status: edm.Status === 'Published' ? 'Published' as const : 'Withdrawn' as const,
        DateTabled: new Date(edm.DateTabled).toISOString()
      }))
      .sort((a, b) => 
        new Date(b.DateTabled).getTime() - new Date(a.DateTabled).getTime()
      );
  }

  private static validateAndProcessTimes(
    times: PublishedOralQuestionTime[]
  ): PublishedOralQuestionTime[] {
    if (!Array.isArray(times)) return [];

    return times
      .filter(time => 
        time.AnsweringWhen && 
        time.DeadlineWhen &&
        time.AnsweringBodyNames
      )
      .map(time => ({
        ...time,
        AnsweringWhen: new Date(time.AnsweringWhen).toISOString(),
        DeadlineWhen: new Date(time.DeadlineWhen).toISOString()
      }))
      .sort((a, b) => 
        new Date(a.AnsweringWhen).getTime() - new Date(b.AnsweringWhen).getTime()
      );
  }

  private static calculateWeekDates(baseDate: Date, forNextWeek: boolean) {
    const currentWeekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    const weekStart = forNextWeek ? addWeeks(currentWeekStart, 1) : currentWeekStart;
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Friday

    return { weekStart, weekEnd };
  }

  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private static async fetchWithErrorHandling<T>(url: string): Promise<T> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        retries++;
        if (retries === this.MAX_RETRIES) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
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
      if (!forceRefresh) {
        const cached = await getRedisValue<T>(cacheKey);
        if (cached) return cached;
      }

      const data = await fetcher();

      if (data && Object.keys(data).length > 0) {
        await setRedisValue(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`Cache operation failed for key ${cacheKey}:`, error);
      return fetcher();
    }
  }

  static processScheduleData(data: HansardData): DaySchedule[] {
    const dayMap = new Map<string, DaySchedule>();

    // First, process question times to ensure they're always shown
    if (Array.isArray(data.questionTimes)) {
      data.questionTimes.forEach((time) => {
        if (!time.AnsweringWhen) return;

        const date = new Date(time.AnsweringWhen);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date, timeSlots: [] });
        }

        const day = dayMap.get(dateKey)!;
        
        // Create a time slot for the department
        const timeSlot: TimeSlot = {
          type: 'oral-questions',
          department: time.AnsweringBodyNames,
          minister: undefined, // We don't have minister details in question times
          ministerTitle: time.AnsweringMinisterTitles,
          questions: [], // Start with empty questions array
          time: {
            substantive: time.SubstantiveTime || null,
            topical: time.TopicalTime || null,
            deadline: new Date(time.DeadlineWhen).toISOString()
          }
        };

        day.timeSlots.push(timeSlot);
      });
    }

    // Then process actual questions to add them to existing time slots
    if (Array.isArray(data.oralQuestions)) {
      data.oralQuestions.forEach((question: PublishedOralQuestion) => {
        if (!question.AnsweringWhen) return;

        const date = new Date(question.AnsweringWhen);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date, timeSlots: [] });
        }

        const day = dayMap.get(dateKey)!;
        let timeSlot = day.timeSlots.find(
          slot => slot.type === 'oral-questions' && 
                  slot.department === question.AnsweringBody
        );

        if (!timeSlot) {
          timeSlot = {
            type: 'oral-questions',
            department: question.AnsweringBody,
            minister: question.AnsweringMinister,
            ministerTitle: question.AnsweringMinisterTitle,
            questions: []
          };
          day.timeSlots.push(timeSlot);
        }

        // Update minister info if we have it
        if (question.AnsweringMinister) {
          timeSlot.minister = question.AnsweringMinister;
        }

        const existingQuestion = timeSlot.questions?.find(q => 
          q.text === question.QuestionText
        );

        if (existingQuestion && question.AskingMember) {
          existingQuestion.askingMembers.push({
            Name: question.AskingMember.Name,
            Constituency: question.AskingMember.Constituency,
            Party: question.AskingMember.Party,
            PhotoUrl: question.AskingMember.PhotoUrl
          });
        } else if (timeSlot.questions && question.AskingMember) {
          timeSlot.questions.push({
            id: question.Id,
            UIN: question.UIN,
            text: question.QuestionText,
            askingMembers: [{
              Name: question.AskingMember.Name,
              Constituency: question.AskingMember.Constituency,
              Party: question.AskingMember.Party,
              PhotoUrl: question.AskingMember.PhotoUrl
            }]
          });
        }
      });
    }

    // Process EDMs
    if (Array.isArray(data.earlyDayMotions)) {
      data.earlyDayMotions.forEach((edm: PublishedEarlyDayMotion) => {
        if (!edm.DateTabled) return;

        const date = new Date(edm.DateTabled);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date, timeSlots: [] });
        }

        const day = dayMap.get(dateKey)!;
        day.timeSlots.push({
          type: 'edm',
          edm: {
            id: edm.Id,            // Add the primary ID
            UIN: edm.UIN,         // Add the UIN if available
            Title: edm.Title,
            Text: edm.MotionText,
            PrimarySponsor: {
              Name: edm.PrimarySponsor.Name,
              PhotoUrl: edm.PrimarySponsor.PhotoUrl,
              Party: edm.PrimarySponsor.Party
            },
            DateTabled: edm.DateTabled
          }
        });
      });
    }

    return Array.from(dayMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}