'use client';

import { useState, useMemo, useEffect, createContext } from "react";
import { format, addWeeks, startOfWeek, isFuture, differenceInWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";
import { WeekView } from "./CalendarViews";
import { CalendarApi } from '@/lib/calendar-api';
import { isItemSaved } from "@/lib/supabase/saved-searches";
import type { TimeSlot } from '@/types/calendar';
import { WeekSkeleton } from './CalendarSkeleton';
import { CalendarFilters, type EventFilters } from './CalendarFilters';
import { useQuery } from '@tanstack/react-query';

// Add context for saved questions
interface SavedQuestionsContextType {
  savedQuestions: Set<string>;
  setSavedQuestions: (questions: Set<string>) => void;
}

export const SavedQuestionsContext = createContext<SavedQuestionsContextType>({
  savedQuestions: new Set(),
  setSavedQuestions: () => {},
});

export function UpcomingDebates() {
  const [view, setView] = useState<'week'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [savedQuestions, setSavedQuestions] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<EventFilters>({
    'Oral Questions': true,
    'Main Chamber': true,
    'Westminster Hall': true,
    'Private Meeting': false,
    'Introduction(s)': true,
    'Orders and Regulations': true,
    'Private Members\' Bills': true,
    'Legislation': true,
    'Bills': true,
    'EDMs': true,
    'Oral evidence': false,
    'Ministerial Statement': true,
    'Backbench Business': true,
  });

  // Get start of week for consistent querying
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: schedule = [], isFetching } = useQuery({
    queryKey: ['calendar', weekStart.toISOString()],
    queryFn: async () => {
      // Calculate week offset from current week
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDiff = differenceInWeeks(weekStart, currentWeekStart);
      
      const data = await CalendarApi.getWeeklyEvents(weekDiff);
      return CalendarApi.processScheduleData(data);
    }
  });

  // Handle navigation
  const handlePrevious = () => {
    setCurrentDate(prev => addWeeks(prev, -1));
  };

  const handleNext = () => {
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format the date range for the header
  const dateRangeText = useMemo(() => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday

    const isSameMonth = weekStart.getMonth() === weekEnd.getMonth();
    const isSameYear = weekStart.getFullYear() === weekEnd.getFullYear();

    if (isSameMonth && isSameYear) {
      return `${format(weekStart, 'MMMM yyyy')}`;
    } else if (isSameYear) {
      return `${format(weekStart, 'MMM')} - ${format(weekEnd, 'MMM yyyy')}`;
    } else {
      return `${format(weekStart, 'MMM yyyy')} - ${format(weekEnd, 'MMM yyyy')}`;
    }
  }, [currentDate]);

  // Add effect to check saved status when schedule changes
  useEffect(() => {
    if (!schedule.length) return;

    const checkSavedQuestions = async () => {
      const savedKeys = new Set<string>();
      
      // Check each question
      await Promise.all(
        schedule.flatMap(day => 
          day.timeSlots
            .filter((slot): slot is TimeSlot & { type: 'oral-questions', questions: NonNullable<TimeSlot['questions']> } => 
              slot.type === 'oral-questions' && !!slot.questions
            )
            .flatMap(slot => 
              slot.questions.map(async q => {
                const sessionDate = slot.time?.substantive || slot.time?.topical;
                const minister = slot.minister?.Name;
                
                if (!sessionDate || !minister || !q.text) return;

                try {
                  const isSaved = await isItemSaved('question', {
                    title: q.text,
                    date: sessionDate,
                    minister: minister
                  });
                  
                  if (isSaved) {
                    savedKeys.add(`${q.text}|${sessionDate}|${minister}`);
                  }
                } catch (error) {
                  console.error('Error checking saved status:', error);
                }
              })
            )
        )
      );

      setSavedQuestions(savedKeys);
    };

    checkSavedQuestions();
  }, [schedule]);

  // Filter schedule based on selected categories
  const filteredSchedule = useMemo(() => {
    if (!schedule.length) return [];

    return schedule.map(day => ({
      ...day,
      timeSlots: day.timeSlots.filter(slot => {
        if (slot.type === 'oral-questions') {
          return filters['Oral Questions'];
        }
        if (slot.type === 'edm') {
          return filters['EDMs'];
        }
        if (slot.type === 'event') {
          // Check category first
          const category = slot.event?.category?.toLowerCase();
          
          if (category === 'oral evidence') {
            return filters['Oral evidence'];
          }
          if (category === 'private meeting') {
            return filters['Private Meeting'];
          }
          if (category === 'debate') {
            return filters['Main Chamber'];
          }
          if (category === 'ministerial statement') {
            return filters['Ministerial Statement'];
          }
          if (category === 'backbench business') {
            return filters['Backbench Business'];
          }
          if (category?.includes('introduction')) {
            return filters['Introduction(s)'];
          }
          if (category?.includes('orders and regulations')) {
            return filters['Orders and Regulations'];
          }
          if (category?.includes('private members\' bills')) {
            return filters['Private Members\' Bills'];
          }
          if (category?.includes('legislation')) {
            return filters['Legislation'];
          }
          if (slot.event?.type?.toLowerCase().includes('westminster hall')) {
            return filters['Westminster Hall'];
          }
          return true;
        }
        return true;
      })
    }));
  }, [schedule, filters]);

  return (
    <SavedQuestionsContext.Provider value={{ savedQuestions, setSavedQuestions }}>
      <div className="space-y-1">
        <div className="flex items-center gap-6">
          <Button 
            variant="outline" 
            className="rounded-full px-6 hover:bg-gray-100 border-gray-300"
            onClick={handleToday}
          >
            Today
          </Button>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={isFetching}
              className="rounded-full h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={isFetching}
              className="rounded-full h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <h2 className="text-xl font-normal">
            {dateRangeText}
          </h2>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <CalendarFilters 
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </div>

        {isFetching ? (
          <WeekSkeleton />
        ) : (
          <WeekView currentDate={currentDate} schedule={filteredSchedule} />
        )}
      </div>
    </SavedQuestionsContext.Provider>
  );
} 