import { format, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileImage } from "./SharedComponents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TimeSlot } from '@/types/calendar';
import { CalendarApi } from '@/lib/calendar-api';
import { useMemo } from "react";
import { SaveQuestionButton } from './SaveQuestionButton';

export function CalendarDay({ 
  date, 
  sessions,
  isToday,
  isCurrentMonth,
}: { 
  date: Date;
  sessions: TimeSlot[];
  isToday: boolean;
  isCurrentMonth: boolean;
}) {
  return (
    <div className={cn(
      "min-h-[100px] p-1.5 relative border-r border-gray-200 last:border-r-0",
      isToday && "bg-blue-50/50",
      !isCurrentMonth && "bg-black"
    )}>
      <span className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full mb-1",
        "text-xs",
        isToday && "bg-blue-600 text-white",
        !isToday && "text-gray-600"
      )}>
        {format(date, 'd')}
      </span>
      <div className="space-y-0.5">
        {sessions.map((session, index) => (
          <SessionPopover 
            key={`${session.type}-${index}`}
            session={session}
            size="normal"
          />
        ))}
      </div>
    </div>
  );
}

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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-xl overflow-hidden bg-card shadow-sm">
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

          {/* Day columns */}
          {Array.from({ length: 5 }, (_, dayIndex) => {
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + dayIndex);
            const daySchedule = schedule.find(day => 
              format(day.date, 'yyyy-MM-dd') === format(currentDay, 'yyyy-MM-dd')
            );

            return (
              <div 
                key={dayIndex} 
                className={cn(
                  "relative border-l min-h-[720px]",
                  isToday(currentDay) && "bg-primary/5"
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

                {/* Events */}
                {daySchedule?.timeSlots.map((session, sessionIndex) => {
                  // Get the earliest time between substantive and topical
                  const startTimeStr = session.time?.substantive || session.time?.topical || '09:00';
                  // If both exist, use the later one as end time, otherwise add 1 hour to start time
                  const endTimeStr = (session.time?.substantive && session.time?.topical) 
                    ? (session.time.topical > session.time.substantive ? session.time.topical : session.time.substantive)
                    : startTimeStr.split(':').map((part, i) => i === 0 ? String(Number(part) + 1).padStart(2, '0') : part).join(':');

                  const startTime = new Date(`${format(currentDay, 'yyyy-MM-dd')}T${startTimeStr}`);
                  const endTime = new Date(`${format(currentDay, 'yyyy-MM-dd')}T${endTimeStr}`);
                  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                  const duration = (endTime.getHours() * 60 + endTime.getMinutes()) - startMinutes;
                  
                  return (
                    <SessionPopover 
                      key={sessionIndex}
                      session={session}
                      size="compact"
                      style={{
                        position: 'absolute',
                        top: `${(startMinutes - 8 * 60)}px`,
                        height: `${duration}px`,
                        left: '4px',
                        right: '4px',
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SessionPopoverProps {
  session: TimeSlot;
  size: 'normal' | 'compact';
  style?: React.CSSProperties;
}

function SessionPopover({ session, size, style }: SessionPopoverProps) {
  // Get time display
  const timeDisplay = useMemo(() => {
    if (!session.time) return '';
    const times = [];
    
    const formatTimeString = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return format(date, 'h:mma');
    };

    if (session.time.substantive) {
      times.push(formatTimeString(session.time.substantive));
    }
    if (session.time.topical) {
      times.push(formatTimeString(session.time.topical));
    }
    
    return times.join(' - ');
  }, [session.time]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "group relative",
            size === 'compact' 
              ? "bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20"
              : "w-full justify-start rounded-md hover:bg-primary/5",
            "p-2 h-auto text-left overflow-hidden"
          )}
          style={style}
        >
          <div className="flex flex-col gap-1 min-w-0">
            {/* Time display for compact view */}
            {size === 'compact' && timeDisplay && (
              <div className="text-[10px] font-medium text-primary/70">
                {timeDisplay}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <ProfileImage
                src={session.type === 'oral-questions' 
                  ? session.minister?.PhotoUrl 
                  : session.edm?.PrimarySponsor.PhotoUrl}
                alt={session.type === 'oral-questions'
                  ? (session.minister?.Name || 'Minister')
                  : (session.edm?.PrimarySponsor.Name || 'Member')}
                size={size === 'compact' ? 20 : 24}
                party={session.type === 'edm' ? session.edm?.PrimarySponsor.Party : undefined}
              />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium truncate",
                  size === 'compact' ? 'text-xs' : 'text-sm'
                )}>
                  {session.type === 'oral-questions' 
                    ? session.department 
                    : 'Early Day Motion'}
                </div>
                {size === 'normal' && (
                  <div className="text-xs truncate text-muted-foreground">
                    {session.type === 'oral-questions'
                      ? `${session.questions?.length || 0} questions`
                      : session.edm?.Title}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Hover indicator */}
          <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-[inherit]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 rounded-lg shadow-lg border-gray-200" 
        align="start"
      >
        {session.type === 'oral-questions' ? (
          <OralQuestionsContent session={session} />
        ) : (
          <EDMContent session={session} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function OralQuestionsContent({ session }: { session: TimeSlot }) {
  return (
    <div className="flex flex-col max-h-[400px] overflow-y-auto">
      <div className="p-4 border-b bg-muted">
        <div className="flex items-center gap-3">
          <ProfileImage
            src={session.minister?.PhotoUrl}
            alt={session.minister?.Name || 'Minister'}
            size={40}
          />
          <div>
            <h4 className="font-medium text-sm">{session.department}</h4>
            <p className="text-xs text-muted-foreground">
              {session.minister?.Name || session.ministerTitle}
            </p>
            {session.time && (
              <div className="mt-1 space-y-1">
                {session.time.substantive && (
                  <p className="text-xs">
                    Substantive: {session.time.substantive}
                  </p>
                )}
                {session.time.topical && (
                  <p className="text-xs">
                    Topical: {session.time.topical}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Deadline: {new Date(session.time.deadline).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        {session.questions?.length ? (
          session.questions.map((question, index) => (
            <div key={index} className="p-4 border-b last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm mb-2">{question.text}</p>
                <SaveQuestionButton 
                  session={session}
                  question={{
                    id: question.UIN,
                    UIN: question.UIN,
                    text: question.text,
                    askingMembers: question.askingMembers
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {question.askingMembers.map((member, memberIndex) => (
                  <div 
                    key={memberIndex}
                    className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1"
                  >
                    <ProfileImage
                      src={member.PhotoUrl}
                      alt={member.Name}
                      size={24}
                      party={member.Party}
                    />
                    <div className="text-xs">
                      <span className="font-medium">{member.Name}</span>
                      <span className="text-muted-foreground ml-1">
                        {member.Constituency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            No questions tabled yet
          </div>
        )}
      </div>
    </div>
  );
}

function EDMContent({ session }: { session: TimeSlot }) {
  return (
    <div>
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <ProfileImage
            src={session.edm?.PrimarySponsor.PhotoUrl}
            alt={session.edm?.PrimarySponsor.Name || 'Member'}
            size={40}
            party={session.edm?.PrimarySponsor.Party}
          />
          <div>
            <h4 className="font-medium text-sm">Early Day Motion</h4>
            <p className="text-xs text-muted-foreground">
              {session.edm?.PrimarySponsor.Name}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium mb-2">{session.edm?.Title}</h3>
        <p className="text-sm text-muted-foreground">{session.edm?.Text}</p>
      </div>
    </div>
  );
}
