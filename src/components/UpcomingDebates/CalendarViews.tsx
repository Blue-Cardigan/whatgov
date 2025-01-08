import { format, isToday } from "date-fns";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DaySchedule, TimeSlot } from '@/types/calendar';
import { CalendarApi } from '@/lib/calendar-api';
import { UntimedItems } from "./UntimedItems";
import { SessionPopover } from "./SessionPopover";

export function WeekView({ currentDate, schedule }: { 
  currentDate: Date; 
  schedule: ReturnType<typeof CalendarApi.processScheduleData> 
}) {
  // Calculate the start of the week (Monday)
  const weekStart = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(start.setDate(diff));
  }, [currentDate]);

  // Generate array of hours for the day
  const hours = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM
  }, []);

  // Updated function to process events and handle overlaps
  const processEventsWithOverlap = (daySchedule: DaySchedule) => {
    // Get timed sessions, including oral questions with proper timing
    const timedSessions = daySchedule?.timeSlots.filter(s => {
      // Include oral questions that have timing information
      if (s.type === 'oral-questions' && s.time?.substantive) {
        return true;
      }
      // Include other event types with timing, except duplicates
      if (s.type === 'event') {
        // Skip event sessions that duplicate oral questions
        if (s.event?.category?.toLowerCase() === 'oral questions' || 
            s.event?.category?.toLowerCase().includes('prime minister')) {
          return false;
        }
        return s.time?.substantive || s.time?.topical;
      }
      return s.time?.substantive || s.time?.topical;
    }) || [];
    
    // Sort sessions by start time
    const sortedSessions = timedSessions.sort((a, b) => {
      const timeA = a.time?.substantive || a.time?.topical || '';
      const timeB = b.time?.substantive || b.time?.topical || '';
      return timeA.localeCompare(timeB);
    });

    // Group overlapping events
    const overlappingGroups: TimeSlot[][] = [];
    let currentGroup: TimeSlot[] = [];

    sortedSessions.forEach((session, index) => {
      const sessionStart = session.time?.substantive || session.time?.topical || '';
      const sessionEnd = session.time?.topical || session.time?.substantive || '';
      
      if (index === 0) {
        currentGroup.push(session);
        return;
      }

      const previousSession = sortedSessions[index - 1];
      const previousEnd = previousSession.time?.topical || previousSession.time?.substantive || '';

      // Check if current session overlaps with previous
      if (sessionStart <= previousEnd) {
        if (!currentGroup.includes(previousSession)) {
          currentGroup.push(previousSession);
        }
        currentGroup.push(session);
      } else {
        if (currentGroup.length > 0) {
          overlappingGroups.push([...currentGroup]);
          currentGroup = [];
        }
        currentGroup = [session];
      }
    });

    if (currentGroup.length > 0) {
      overlappingGroups.push(currentGroup);
    }

    return overlappingGroups;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Time column headers */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b bg-card flex-none">
        <div className="border-r" />
        {Array.from({ length: 5 }, (_, i) => {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          return (
            <div 
              key={i} 
              className={cn(
                "py-2 px-4 text-center border-r last:border-r-0",
                isToday(day) && "bg-blue-50/50"
              )}
            >
              <div className="font-medium">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-full",
                isToday(day) && "bg-blue-600 text-white"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto bg-card">
        <div className="grid grid-cols-[60px_repeat(5,1fr)] relative h-full">
          {/* Time labels */}
          <div className="relative">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="absolute w-full border-b border-gray-100"
                style={{ top: `${(hour - 8) * 60}px` }}
              >
                <span className="absolute -top-3 right-2 text-xs text-gray-400 font-medium">
                  {format(new Date().setHours(hour, 0), 'ha')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns with improved overlap handling */}
          {Array.from({ length: 5 }, (_, dayIndex) => {
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + dayIndex);
            const daySchedule = schedule.find(day => 
              format(day.date, 'yyyy-MM-dd') === format(currentDay, 'yyyy-MM-dd')
            );

            const eventGroups = daySchedule ? processEventsWithOverlap(daySchedule) : [];
            const untimedSessions = daySchedule?.timeSlots.filter(s => {
              // Include sessions without timing information
              if (!s.time?.substantive && !s.time?.topical) {
                return true;
              }
              // Exclude oral questions without timing (they should be handled by timed sessions)
              if (s.type === 'oral-questions') {
                return false;
              }
              return false;
            }) || [];

            return (
              <div 
                key={dayIndex} 
                className={cn(
                  "relative border-l flex flex-col",
                  isToday(currentDay) && "bg-primary/5"
                )}
                style={{ minHeight: '720px' }}
              >
                {/* Current time indicator */}
                {isToday(currentDay) && (
                  <div 
                    className="absolute w-full z-10 flex items-center gap-1"
                    style={{ 
                      top: `${(new Date().getHours() - 8) * 60 + new Date().getMinutes()}px` 
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="flex-1 border-t border-primary" />
                  </div>
                )}

                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div 
                    key={hour}
                    className="absolute w-full border-b border-gray-100"
                    style={{ top: `${(hour - 8) * 60}px`, height: '60px' }}
                  />
                ))}

                {/* Untimed Items */}
                {untimedSessions.length > 0 && (
                  <UntimedItems items={untimedSessions} />
                )}

                {/* Timed Events with overlap handling */}
                <div className="flex-1 relative">
                  {eventGroups.map((group, groupIndex) => {
                    const groupWidth = 100 / group.length;
                    
                    return group.map((session, sessionIndex) => {
                      const startTimeStr = session.time?.substantive || session.time?.topical || '11:30';
                      const endTimeStr = (session.time?.substantive && session.time?.topical) 
                        ? (session.time.topical > session.time.substantive ? session.time.topical : session.time.substantive)
                        : startTimeStr.split(':').map((part, i) => i === 0 ? String(Number(part) + 1).padStart(2, '0') : part).join(':');

                      const startTime = new Date(`${format(currentDay, 'yyyy-MM-dd')}T${startTimeStr}`);
                      const endTime = new Date(`${format(currentDay, 'yyyy-MM-dd')}T${endTimeStr}`);
                      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                      const duration = (endTime.getHours() * 60 + endTime.getMinutes()) - startMinutes;

                      return (
                        <SessionPopover 
                          key={`${groupIndex}-${sessionIndex}`}
                          session={session}
                          size="compact"
                          style={{
                            position: 'absolute',
                            top: `${(startMinutes - 8 * 60)}px`,
                            height: `${duration}px`,
                            left: `${4 + (sessionIndex * groupWidth)}%`,
                            width: `${groupWidth - 2}%`,
                            zIndex: group.length > 1 ? 10 + sessionIndex : 1,
                          }}
                        />
                      );
                    });
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

