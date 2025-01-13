import { format, startOfWeek, endOfWeek, addWeeks, addMinutes, setHours, setMinutes } from 'date-fns';
import type { 
  PublishedEarlyDayMotion, 
  OralQuestion, 
  OralQuestionTime,
  PublishedBill,
  PublishedBillSitting,
  HansardData,
  TimeSlot,
  DaySchedule,
  WhatsOnEvent
} from '@/types/calendar';
import type { FetchOptions } from '@/types';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';

export class CalendarApi {
  static readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  static readonly NEXT_WEEK_CACHE_TTL = 1800; // 30 minutes
  static readonly MAX_RETRIES = 2;
  static readonly MAX_ITEMS_PER_REQUEST = 40;

  static async getWeeklyEvents(
    weekOffset: number = 0,
    options: FetchOptions = {}
  ): Promise<HansardData> {
    const today = new Date();
    const cacheKey = `hansard:calendar:week:${weekOffset}:${format(today, 'yyyy-MM-dd')}`;
        
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const { weekStart, weekEnd } = this.calculateWeekDates(today, weekOffset);
        
        // Only return empty data for current week on weekends
        if (weekOffset === 0 && this.isWeekend(today)) {
          return this.getEmptyHansardData();
        }
        
        return this.fetchHansardData(weekStart, weekEnd);
      },
      {
        ...options,
        // Adjust cache TTL based on whether we're looking at past/future data
        cacheTTL: weekOffset > 0 
          ? this.NEXT_WEEK_CACHE_TTL  // Future weeks
          : this.DEFAULT_CACHE_TTL    // Current/past weeks
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
      questionTimes: [],
      events: []
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
        const [questionsResponse, eventsResponse] = await Promise.all([
          this.fetchWithErrorHandling<{
            earlyDayMotions: PublishedEarlyDayMotion[];
            oralQuestions: OralQuestion[];
            questionTimes: OralQuestionTime[];
          }>(`/api/hansard/questions?${params.toString()}`),

          this.fetchWithErrorHandling<{
            data: WhatsOnEvent[];
          }>(`/api/hansard/whatson?${params.toString()}`)
        ]);

        // Merge existing data
        allData.earlyDayMotions = [...allData.earlyDayMotions, ...(questionsResponse.earlyDayMotions || [])];
        allData.oralQuestions = [...allData.oralQuestions, ...(questionsResponse.oralQuestions || [])];
        allData.questionTimes = [...allData.questionTimes, ...(questionsResponse.questionTimes || [])];
        allData.events = [...allData.events, ...(eventsResponse.data || [])];
        
        // Check if we received a full page of results
        hasMore = questionsResponse.oralQuestions?.length === this.MAX_ITEMS_PER_REQUEST;
        skip += this.MAX_ITEMS_PER_REQUEST;

      } catch (error) {
        console.error('Error fetching data:', error);
        hasMore = false;
      }
    }

    return allData;
  }

  private static getEmptyHansardData(): HansardData {
    return {
      oralQuestions: [],
      earlyDayMotions: [],
      questionTimes: [],
      events: []
    };
  }

  private static calculateWeekDates(baseDate: Date, weekOffset: number) {
    const currentWeekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    const weekStart = addWeeks(currentWeekStart, weekOffset);
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

  private static processOralQuestions(questions: OralQuestion[]): Map<string, TimeSlot> {
    const sessionMap = new Map<string, TimeSlot>();

    // First, group questions by department and date
    questions.forEach(question => {
      if (!question.AnsweringWhen) return;

      const date = new Date(question.AnsweringWhen);
      const sessionKey = `oq-${question.AnsweringBodyId}-${format(date, 'yyyy-MM-dd')}`;

      let session = sessionMap.get(sessionKey);
      if (!session) {
        // Create new session with default time of 11:30 if not specified
        const defaultTime = '11:30';
        
        session = {
          type: 'oral-questions',
          department: question.AnsweringBody,
          departmentId: question.AnsweringBodyId,
          ministerTitle: question.AnsweringMinisterTitle,
          minister: question.AnsweringMinister,
          questions: [],
          time: {
            substantive: defaultTime,
            topical: null,
            deadline: format(new Date(question.TabledWhen), 'yyyy-MM-dd')
          }
        };
        sessionMap.set(sessionKey, session);
      }

      // Add question to session
      if (session.questions && question.AskingMember) {
        const existingQuestion = session.questions.find(q => q.id === question.Id);
        
        if (existingQuestion) {
          // Add asking member if not already present
          if (!existingQuestion.askingMembers.some(m => m.Name === question.AskingMember.Name)) {
            existingQuestion.askingMembers.push({
              Name: question.AskingMember.Name,
              Constituency: question.AskingMember.Constituency,
              Party: question.AskingMember.Party,
              PhotoUrl: question.AskingMember.PhotoUrl
            });
          }
        } else {
          // Add new question
          session?.questions?.push({
            id: question.Id,
            UIN: question.UIN,
            text: question.QuestionText,
            questionType: question.QuestionType === 'Substantive' ? 'Substantive' : 'Topical',
            answeringWhen: question.AnsweringWhen,
            AnsweringBodyId: question.AnsweringBodyId,
            askingMembers: [{
              Name: question.AskingMember.Name,
              Constituency: question.AskingMember.Constituency,
              Party: question.AskingMember.Party,
              PhotoUrl: question.AskingMember.PhotoUrl
            }]
          });
        }
      }
    });

    return sessionMap;
  }

  static processScheduleData(data: HansardData): DaySchedule[] {
    const dayMap = new Map<string, DaySchedule>();

    // Process oral questions
    if (Array.isArray(data.oralQuestions)) {
      const sessionMap = this.processOralQuestions(data.oralQuestions);
      
      // Add sessions to appropriate days
      sessionMap.forEach(session => {
        const date = new Date(session.questions?.[0]?.answeringWhen ?? '');
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date, timeSlots: [] });
        }

        dayMap.get(dateKey)!.timeSlots.push(session);
      });
    }

    // Process EDMs with timing
    if (Array.isArray(data.earlyDayMotions)) {
      const edmsByDate = new Map<string, PublishedEarlyDayMotion[]>();
      
      // Group EDMs by date
      data.earlyDayMotions.forEach((edm: PublishedEarlyDayMotion) => {
        if (!edm.DateTabled) return;
        
        const dateKey = format(new Date(edm.DateTabled), 'yyyy-MM-dd');
        if (!edmsByDate.has(dateKey)) {
          edmsByDate.set(dateKey, []);
        }
        edmsByDate.get(dateKey)!.push(edm);
      });

      // Create timed slots for EDMs
      edmsByDate.forEach((dayEdms, dateKey) => {
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date: new Date(dateKey), timeSlots: [] });
        }

        const day = dayMap.get(dateKey)!;
        const baseTime = setHours(setMinutes(new Date(dateKey), 0), 9); // 9:00 AM

        // Create individual slots for each EDM, 10 minutes apart
        dayEdms.forEach((edm, index) => {
          const startTime = addMinutes(baseTime, index * 10);
          const endTime = addMinutes(startTime, 10);

          day.timeSlots.push({
            type: 'edm',
            time: {
              substantive: format(startTime, 'HH:mm'),
              topical: format(endTime, 'HH:mm'),
              deadline: ''
            },
            edm: {
              id: edm.Id,
              UIN: edm.UIN,
              title: edm.Title,
              text: edm.MotionText,
              primarySponsor: {
                name: edm.PrimarySponsor.Name,
                photoUrl: edm.PrimarySponsor.PhotoUrl,
                party: edm.PrimarySponsor.Party
              },
              dateTabled: edm.DateTabled
            }
          });
        });
      });
    }

    // Process WhatsOn events
    if (Array.isArray(data.events)) {
      data.events.forEach((event) => {
        if (!event.startTime) return;

        const date = new Date(event.startTime);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date, timeSlots: [] });
        }

        const day = dayMap.get(dateKey)!;
        
        day.timeSlots.push({
          type: 'event',
          time: {
            substantive: format(new Date(event.startTime), 'HH:mm'),
            topical: event.endTime ? format(new Date(event.endTime), 'HH:mm') : null,
            deadline: ''
          },
          event: {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            category: event.category,
            house: event.house,
            startTime: event.startTime,
            endTime: event.endTime,
            members: event.members,
            type: event.type,
          }
        });
      });
    }

    // Sort time slots within each day
    return Array.from(dayMap.values())
      .map(day => ({
        ...day,
        timeSlots: day.timeSlots.sort((a, b) => {
          const timeA = a.time?.substantive ?? '';
          const timeB = b.time?.substantive ?? '';
          return timeA.localeCompare(timeB);
        })
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}