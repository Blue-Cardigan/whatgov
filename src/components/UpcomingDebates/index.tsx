'use client';

import { useState, useMemo, useEffect, createContext, useContext } from "react";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Search, HelpCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarData } from '@/hooks/useCalendarData';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WeekView, CalendarDay } from "./CalendarViews";
import { CalendarApi } from '@/lib/calendar-api';
import { isItemSaved } from "@/lib/supabase/saved-searches";
import type { TimeSlot } from '@/types/calendar';
import { MonthSkeleton, WeekSkeleton } from './CalendarSkeleton';

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
  const { 
    rawData,
    isFetching,
    currentDate,
    setCurrentDate,
    goToPreviousMonth,
    goToNextMonth
  } = useCalendarData();

  const [view, setView] = useState<'week' | 'month'>('week');
  const [savedQuestions, setSavedQuestions] = useState<Set<string>>(new Set());

  // Modify navigation functions to handle both week and month views
  const handlePrevious = () => {
    if (view === 'week') {
      // Move back one week
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() - 7);
        return newDate;
      });
    } else {
      // Move back one month
      goToPreviousMonth();
    }
  };

  const handleNext = () => {
    if (view === 'week') {
      // Move forward one week
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() + 7);
        return newDate;
      });
    } else {
      // Move forward one month
      goToNextMonth();
    }
  };

  // Add function to handle Today button
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format the date range for the header
  const dateRangeText = useMemo(() => {
    if (view === 'week') {
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
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  }, [currentDate, view]);

  // Process schedule data using CalendarApi
  const schedule = useMemo(() => {
    if (!rawData) return [];
    const processed = CalendarApi.processScheduleData(rawData);
    return processed;
  }, [rawData]);

  // Get month days
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Group days into weeks with proper typing
  const weeks = useMemo(() => {
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    if (view === 'week') {
      // For weekly view, only show current week
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);

      for (let i = 0; i < 5; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        currentWeek.push(day);
      }
      weeks.push(currentWeek);
    } else {
      // Fix for monthly view
      const firstDay = monthDays[0];
      // Adjust for Monday start (convert Sunday from 0 to 7)
      const dayOfWeek = firstDay.getDay() || 7;
      // Calculate empty days needed before the first day (subtract 1 for Monday start)
      const emptyDays = dayOfWeek - 1;
      
      // Add empty days at start of first week
      for (let i = 0; i < emptyDays; i++) {
        currentWeek.push(null);
      }

      monthDays.forEach(day => {
        // Skip weekend days (6 = Saturday, 0 = Sunday)
        if (day.getDay() === 6 || day.getDay() === 0) return;

        if (currentWeek.length === 5) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
        currentWeek.push(day);
      });

      // Fill remaining days in last week
      while (currentWeek.length < 5) {
        currentWeek.push(null);
      }
      if (currentWeek.length) {
        weeks.push(currentWeek);
      }
    }

    return weeks;
  }, [monthDays, view]);

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

  return (
    <SavedQuestionsContext.Provider value={{ savedQuestions, setSavedQuestions }}>
      <div className="space-y-1">
        <div className="flex items-center gap-6">
          <Button 
            variant="outline" 
            className="rounded-full px-6 hover:bg-gray-100 border-gray-300"
            onClick={goToToday}
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
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10"
            >
              <Settings className="h-5 w-5" />
            </Button>

            <Select 
              defaultValue={view}
              onValueChange={(value) => setView(value as 'week' | 'month')}
            >
              <SelectTrigger className="w-[110px] rounded-full border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFetching ? (
          view === 'week' ? <WeekSkeleton /> : <MonthSkeleton />
        ) : (
          view === 'week' ? (
            <WeekView currentDate={currentDate} schedule={schedule} />
          ) : (
            <Card className="overflow-hidden border-gray-200 rounded-xl shadow-sm">
              <div className="grid grid-cols-5 border-b border-gray-200">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                  <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              <div>
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-5 border-b border-gray-200 last:border-0">
                    {week.map((date, dayIndex) => {
                      if (!date) return (
                        <div key={dayIndex} className="h-8" />
                      );

                      const daySchedule = schedule.find(day => 
                        format(day.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      );

                      return (
                        <CalendarDay
                          key={format(date, 'yyyy-MM-dd')}
                          date={date}
                          sessions={daySchedule?.timeSlots || []}
                          isToday={isToday(date)}
                          isCurrentMonth={isSameMonth(date, currentDate)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          )
        )}
      </div>
    </SavedQuestionsContext.Provider>
  );
} 