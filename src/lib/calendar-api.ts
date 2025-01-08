import { format, startOfWeek, endOfWeek, addWeeks, addMinutes, setHours, setMinutes } from 'date-fns';
import type { 
  PublishedEarlyDayMotion, 
  PublishedOralQuestion, 
  PublishedOralQuestionTime,
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
      questionTimes: [],
      bills: [],
      billSittings: [],
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
        const [questionsResponse, billsResponse, eventsResponse] = await Promise.all([
          this.fetchWithErrorHandling<{
            earlyDayMotions: PublishedEarlyDayMotion[];
            oralQuestions: PublishedOralQuestion[];
            questionTimes: PublishedOralQuestionTime[];
          }>(`/api/hansard/questions?${params.toString()}`),
          
          this.fetchWithErrorHandling<{
            data: {
              bills: PublishedBill[];
              sittings: PublishedBillSitting[];
            }
          }>(`/api/hansard/bills?${params.toString()}`),

          this.fetchWithErrorHandling<{
            data: WhatsOnEvent[];
          }>(`/api/hansard/whatson?${params.toString()}`)
        ]);

        // Merge existing data
        allData.earlyDayMotions = [...allData.earlyDayMotions, ...(questionsResponse.earlyDayMotions || [])];
        allData.oralQuestions = [...allData.oralQuestions, ...(questionsResponse.oralQuestions || [])];
        allData.questionTimes = [...allData.questionTimes, ...(questionsResponse.questionTimes || [])];
        allData.bills = [...allData.bills, ...(billsResponse.data.bills || [])];
        allData.billSittings = [...allData.billSittings, ...(billsResponse.data.sittings || [])];
        
        // Add WhatsOn events
        allData.events = [...allData.events, ...(eventsResponse.data || [])];
        // Check if we received a full page of results
        const hasMoreQuestions = questionsResponse.oralQuestions?.length === this.MAX_ITEMS_PER_REQUEST;
        const hasMoreBills = billsResponse.data.bills?.length === this.MAX_ITEMS_PER_REQUEST;
        
        hasMore = hasMoreQuestions || hasMoreBills;
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
      bills: [],
      billSittings: [],
      events: []
    };
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

    // Process question times first (no changes needed here)
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

    // Process oral questions (no changes needed here)
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

    // Process EDMs (no changes needed here)
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

    // Process bills by house
    if (data.bills && data.billSittings) {
      const billSittingGroups = data.billSittings.reduce((acc, sitting) => {
        const dateKey = format(new Date(sitting.date), 'yyyy-MM-dd');
        const key = `${sitting.billId}-${dateKey}`;
        
        if (!acc.has(key)) {
          acc.set(key, {
            billId: sitting.billId,
            date: dateKey,
            sittings: []
          });
        }
        
        acc.get(key)!.sittings.push(sitting);
        return acc;
      }, new Map<string, {
        billId: number;
        date: string;
        sittings: PublishedBillSitting[];
      }>());

      // Process each group of sittings
      billSittingGroups.forEach((group) => {
        const dateKey = group.date;
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date: new Date(dateKey), timeSlots: [] });
        }
        
        const bill = data.bills.find(b => b.billId === group.billId);
        if (!bill) return;

        const day = dayMap.get(dateKey)!;

        // Sort sittings by stage order
        const sortedSittings = group.sittings.sort((a, b) => {
          const stageA = bill.currentStage?.sortOrder || 0;
          const stageB = bill.currentStage?.sortOrder || 0;
          return stageA - stageB;
        });

        // Create time slot without making up times
        day.timeSlots.push({
          type: 'bill',
          // Only include time information if it's actually provided
          time: sortedSittings[0].time ? {
            substantive: sortedSittings[0].time,
            topical: '',
            deadline: ''
          } : undefined,
          bill: {
            id: bill.billId,
            title: bill.shortTitle || bill.title || '',
            longTitle: bill.longTitle || '',
            summary: bill.summary || '',
            currentHouse: bill.currentHouse,
            originatingHouse: bill.originatingHouse,
            isAct: bill.isAct,
            isDefeated: bill.isDefeated,
            sponsors: bill.sponsors,
            currentStage: bill.currentStage,
            stage: sortedSittings[0].stageId,
            sittings: sortedSittings
          }
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
          // Items with times come first
          if (a.time?.substantive && !b.time?.substantive) return -1;
          if (!a.time?.substantive && b.time?.substantive) return 1;
          
          // If both have times, sort by time
          if (a.time?.substantive && b.time?.substantive) {
            return a.time.substantive.localeCompare(b.time.substantive);
          }
          
          // If neither have times, maintain their order but ensure spacing
          return 0;
        })
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}