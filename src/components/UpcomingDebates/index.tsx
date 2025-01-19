'use client';

import { useState, useMemo, createContext } from "react";
import { format, addWeeks, startOfWeek, addDays, differenceInWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";
import { WeekView } from "./CalendarViews";
import { CalendarApi } from '@/lib/calendar-api';
import { getSavedCalendarItems } from "@/lib/supabase/saved-calendar-items";
import type { TimeSlot } from '@/types/calendar';
import { WeekSkeleton } from './CalendarSkeleton';
import { CalendarFilters, type EventFilters } from './CalendarFilters';
import { useQuery } from '@tanstack/react-query';
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";

// Add context for saved questions
interface SavedQuestionsContextType {
  savedQuestions: Set<string>;
  setSavedQuestions: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export const SavedQuestionsContext = createContext<SavedQuestionsContextType>({
  savedQuestions: new Set<string>(),
  setSavedQuestions: () => {},
});

function UpcomingDebatesContent() {
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
  const [searchTerm, setSearchTerm] = useState('');

  // Get start of week for consistent querying
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4); // Friday

  const { data: schedule = [], isFetching } = useQuery({
    queryKey: ['calendar', weekStart.toISOString()],
    queryFn: async () => {
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDiff = differenceInWeeks(weekStart, currentWeekStart);

      // Only fetch if the week is current or future
      if (weekDiff >= 0) {
        const data = await CalendarApi.getWeeklyEvents(weekDiff);
        return CalendarApi.processScheduleData(data);
      }
      return [];
    }
  });

  // Determine if the current week is the same as the current date's week
  const isCurrentWeek = differenceInWeeks(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) === 0;

  // The savedItems query depends on schedule being loaded
  useQuery({
    queryKey: ['savedItems', weekStart.toISOString()],
    queryFn: async () => {
      const items = await getSavedCalendarItems(weekStart, weekEnd);
      
      // Create a Set to store all possible IDs
      const allIds = new Set<string>();
      
      items.forEach(eventId => {
        allIds.add(eventId);
        
        // If this is a session ID, also add IDs for all questions in that session
        if (eventId.startsWith('oq-') && !eventId.includes('-q')) {
          const [deptId, date] = eventId.split('-');
          
          // Find the corresponding session in the schedule
          schedule.forEach(day => {
            day.timeSlots
              .filter((slot): slot is TimeSlot & { type: 'oral-questions' } => 
                slot.type === 'oral-questions' && 
                slot.departmentId === Number(deptId)
              )
              .forEach(session => {
                // Add individual question IDs
                session.questions?.forEach(question => {
                  allIds.add(`oq-${deptId}-${date}-q${question.id}`);
                });
              });
          });
        }
      });
      
      return Array.from(allIds);
    },
    enabled: schedule.length > 0,
    onSuccess: (data) => {
      setSavedQuestions(new Set(data));
    }
  });

  // Handle navigation
  const handlePrevious = () => {
    if (!isCurrentWeek) {
      setCurrentDate(prev => addWeeks(prev, -1));
    }
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

  // Filter schedule based on selected categories
  const filteredSchedule = useMemo(() => {
    if (!schedule.length) return [];

    const searchLower = searchTerm.toLowerCase();

    return schedule.map(day => ({
      ...day,
      timeSlots: day.timeSlots.filter(slot => {
        // First apply category filters
        let passesFilters = true;
        if (slot.type === 'oral-questions') {
          passesFilters = filters['Oral Questions'];
        }
        if (slot.type === 'edm') {
          passesFilters = filters['EDMs'];
        }
        if (slot.type === 'event') {
          // Check category first
          const category = slot.event?.category?.toLowerCase();
          
          if (category === 'oral evidence') {
            passesFilters = filters['Oral evidence'];
          }
          if (category === 'private meeting') {
            passesFilters = filters['Private Meeting'];
          }
          if (category === 'debate') {
            passesFilters = filters['Main Chamber'];
          }
          if (category === 'ministerial statement') {
            passesFilters = filters['Ministerial Statement'];
          }
          if (category === 'backbench business') {
            passesFilters = filters['Backbench Business'];
          }
          if (category?.includes('introduction')) {
            passesFilters = filters['Introduction(s)'];
          }
          if (category?.includes('orders and regulations')) {
            passesFilters = filters['Orders and Regulations'];
          }
          if (category?.includes('private members\' bills')) {
            passesFilters = filters['Private Members\' Bills'];
          }
          if (category?.includes('legislation')) {
            passesFilters = filters['Legislation'];
          }
          if (slot.event?.type?.toLowerCase().includes('westminster hall')) {
            passesFilters = filters['Westminster Hall'];
          }
        }

        // If it doesn't pass filters, no need to check search
        if (!passesFilters) return false;

        // If no search term, return the filter result
        if (!searchTerm) return true;

        // Search logic for different slot types
        if (slot.type === 'oral-questions') {
          return (
            slot.department?.toLowerCase().includes(searchLower) ||
            slot.questions?.some(q => 
              q.text.toLowerCase().includes(searchLower) ||
              q.askingMembers.some(m => 
                m.Name.toLowerCase().includes(searchLower) ||
                m.Party.toLowerCase().includes(searchLower) ||
                m.Constituency.toLowerCase().includes(searchLower)
              )
            ) ||
            slot.minister?.Name.toLowerCase().includes(searchLower) ||
            slot.minister?.Party.toLowerCase().includes(searchLower) ||
            slot.ministerTitle?.toLowerCase().includes(searchLower)
          );
        }

        if (slot.type === 'event') {
          return (
            slot.event?.title.toLowerCase().includes(searchLower) ||
            slot.event?.description?.toLowerCase().includes(searchLower) ||
            slot.event?.category?.toLowerCase().includes(searchLower) ||
            slot.event?.type?.toLowerCase().includes(searchLower) ||
            slot.event?.house?.toLowerCase().includes(searchLower) ||
            slot.event?.location?.toLowerCase().includes(searchLower) ||
            slot.event?.members?.some(m => 
              m.name.toLowerCase().includes(searchLower) ||
              m.party.toLowerCase().includes(searchLower) ||
              m.constituency.toLowerCase().includes(searchLower)
            )
          );
        }

        if (slot.type === 'edm') {
          return (
            slot.edm?.title.toLowerCase().includes(searchLower) ||
            slot.edm?.text.toLowerCase().includes(searchLower) ||
            slot.edm?.primarySponsor.name.toLowerCase().includes(searchLower) ||
            slot.edm?.primarySponsor.party?.toLowerCase().includes(searchLower)
          );
        }

        return true;
      })
    }));
  }, [schedule, filters, searchTerm]);

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
              disabled={isFetching || isCurrentWeek}
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
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                <Bookmark className="h-4 w-4" />
                Save events to receive a briefing the next morning
              </span>
            </div>
            
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

// New wrapper component
export function UpcomingDebates() {
  return (
    <QueryProvider>
      <UpcomingDebatesContent />
    </QueryProvider>
  );
} 