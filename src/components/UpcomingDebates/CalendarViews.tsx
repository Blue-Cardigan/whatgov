import { format, isToday } from "date-fns";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DaySchedule, TimeSlot } from '@/types/calendar';
import { CalendarApi } from '@/lib/calendar-api';
import { UntimedItems } from "./UntimedItems";
import { SessionPopover } from "./SessionPopover";
import { eventTypeColors } from '@/lib/utils'; // Import the event colors

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
    return Array.from({ length: 17 }, (_, i) => i + 8); // 8 AM to 12 AM (midnight)
  }, []);

  // Updated function to process events and handle overlaps
  const processEventsWithOverlap = (daySchedule: DaySchedule) => {
    // Get timed sessions, including oral questions with proper timing
    const timedSessions = daySchedule?.timeSlots.filter(s => {
      if (s.type === 'oral-questions') {
        // Always include oral questions sessions
        return true;
      }
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
    <div className="border rounded-xl bg-card shadow-sm">
      {/* Time column headers */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b bg-card">
        <div className="border-r" />
        {Array.from({ length: 5 }, (_, i) => {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          const isPast = day < new Date() && !isToday(day);

          return (
            <div 
              key={i} 
              className={cn(
                "py-2 px-4 text-center border-r last:border-r-0",
                isToday(day) && "bg-blue-50/50",
                isPast && "text-gray-400"
              )}
            >
              <div className="font-medium">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-full",
                isToday(day) && "bg-blue-600 text-white",
                isPast && "bg-gray-200"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid - removed overflow and height constraints */}
      <div>
        <div className="grid grid-cols-[60px_repeat(5,1fr)]">
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

          {/* Day columns */}
          {Array.from({ length: 5 }, (_, dayIndex) => {
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + dayIndex);
            const isPast = currentDay < new Date() && !isToday(currentDay);
            const daySchedule = schedule.find(day => 
              format(day.date, 'yyyy-MM-dd') === format(currentDay, 'yyyy-MM-dd')
            );

            const eventGroups = daySchedule ? processEventsWithOverlap(daySchedule) : [];
            const untimedSessions = daySchedule?.timeSlots.filter(s => {
              if (!s.time?.substantive && !s.time?.topical) {
                return true;
              }
              if (s.type === 'oral-questions') {
                return false;
              }
              return false;
            }) || [];

            return (
              <div 
                key={dayIndex} 
                className={cn(
                  "relative border-l",
                  isToday(currentDay) && "bg-primary/5",
                  isPast && "pointer-events-none opacity-50"
                )}
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

                {/* Timed Events */}
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

                      // Determine the color for the event type
                      const eventType = session.type === 'event' ? session.event?.category : session.type;
                      const eventColor = eventTypeColors[eventType || ''] || 'bg-gray-100';

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
                            backgroundColor: eventColor, // Apply the color
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

