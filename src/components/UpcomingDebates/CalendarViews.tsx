import { format, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileImage } from "./SharedComponents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DaySchedule, TimeSlot } from '@/types/calendar';
import { CalendarApi } from '@/lib/calendar-api';
import { useMemo, useState } from "react";
import { SaveCalendarItemButton } from './SaveCalendarItemButton';
import { UntimedItems } from "./UntimedItems";

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
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE_ITEMS = 5;
  
  // Separate timed and untimed sessions
  const { timedSessions, untimedSessions } = useMemo(() => {
    return {
      timedSessions: sessions.filter(s => s.time?.substantive || s.time?.topical),
      untimedSessions: sessions.filter(s => !s.time?.substantive && !s.time?.topical)
    };
  }, [sessions]);
  
  const hasMoreItems = timedSessions.length > MAX_VISIBLE_ITEMS;
  const visibleTimeSlots = showAll 
    ? timedSessions 
    : timedSessions.slice(0, MAX_VISIBLE_ITEMS);

  return (
    <div className={cn(
      "min-h-[6rem] p-2 flex flex-col",
      isToday && "border-t",
      !isCurrentMonth && "border-l first:border-l-0"
    )}>
      <div className="flex-1">
        <time
          dateTime={format(date, 'yyyy-MM-dd')}
          className={cn(
            "ml-auto text-sm",
            isToday && "rounded-full bg-primary text-primary-foreground w-7 h-7 flex items-center justify-center"
          )}
        >
          {isCurrentMonth ? format(date, 'd') : format(date, 'EEE d')}
        </time>

        <div className="flex flex-col gap-1 mt-1">
          {visibleTimeSlots.map((session, idx) => (
            <SessionPopover 
              key={`${session.type}-${idx}`}
              session={session}
              size="compact"
            />
          ))}
          
          {hasMoreItems && !showAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(true)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              +{timedSessions.length - MAX_VISIBLE_ITEMS} more
            </Button>
          )}
          
          {showAll && hasMoreItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(false)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Show less
            </Button>
          )}
        </div>
      </div>

      {untimedSessions.length > 0 && (
        <UntimedItems items={untimedSessions} />
      )}
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

            // Separate timed and untimed sessions
            const timedSessions = daySchedule?.timeSlots.filter(s => s.time?.substantive || s.time?.topical) || [];
            const untimedSessions = daySchedule?.timeSlots.filter(s => !s.time?.substantive && !s.time?.topical) || [];

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

                {/* Timed Events */}
                <div className="flex-1 relative">
                  {timedSessions.map((session, sessionIndex) => {
                    // Get the earliest time between substantive and topical
                    const startTimeStr = session.time?.substantive || session.time?.topical || '11:30';
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

export function SessionPopover({ session, size = 'normal', style }: SessionPopoverProps) {
  const height = session.duration 
    ? `${Math.max(40, session.duration / 2)}px`  // Convert minutes to pixels
    : 'auto';

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
            "p-2 text-left overflow-hidden"
          )}
          style={{ 
            ...style,
            height,
            minHeight: '40px'
          }}
        >
          <div className="flex flex-col gap-1 min-w-0">
            {size === 'compact' && session.time?.substantive && (
              <div className="text-[10px] font-medium text-primary/70">
                {session.time.substantive}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <ProfileImage
                src={
                  session.type === 'oral-questions' 
                    ? session.minister?.PhotoUrl 
                    : session.type === 'edm'
                    ? session.edm?.PrimarySponsor.PhotoUrl
                    : session.bill?.sponsors[0]?.member?.memberPhoto
                }
                alt={
                  session.type === 'oral-questions'
                    ? (session.minister?.Name || 'Minister')
                    : session.type === 'edm'
                    ? (session.edm?.PrimarySponsor.Name || 'Member')
                    : (session.bill?.sponsors[0]?.member?.name || 'Sponsor')
                }
                size={size === 'compact' ? 20 : 24}
                party={
                  session.type === 'edm' 
                    ? session.edm?.PrimarySponsor.Party 
                    : session.type === 'bill'
                    ? session.bill?.sponsors[0]?.member?.party
                    : undefined
                }
              />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium truncate",
                  size === 'compact' ? 'text-xs' : 'text-sm'
                )}>
                  {session.type === 'oral-questions' 
                    ? session.department 
                    : session.type === 'edm'
                    ? 'Early Day Motion'
                    : session.bill?.title}
                </div>
                {size === 'normal' && (
                  <div className="text-xs truncate text-muted-foreground">
                    {session.type === 'oral-questions'
                      ? `${session.questions?.length || 0} questions`
                      : session.type === 'edm'
                      ? session.edm?.Title
                      : session.bill && (
                          <>
                            {session.bill.originatingHouse} → {session.bill.currentHouse}
                            {session.bill.currentStage && ` • ${session.bill.currentStage.description}`}
                          </>
                        )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-[inherit]" />
          {session.type === 'bill' && session.bill?.sittings && session.bill.sittings.length > 1 && (
            <div className="text-xs text-muted-foreground mt-1">
              {session.bill.sittings.length} sittings
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 rounded-lg shadow-lg border-gray-200" 
      >
        {session.type === 'oral-questions' ? (
          <OralQuestionsContent session={session as TimeSlot & { type: 'oral-questions' } } />
        ) : session.type === 'edm' ? (
          <EDMContent session={session as TimeSlot & { type: 'edm'; edm: NonNullable<TimeSlot['edm']> } } />
        ) : (
          <BillContent session={session as TimeSlot & { type: 'bill'; bill: NonNullable<TimeSlot['bill']> } } />
        )}
      </PopoverContent>
    </Popover>
  );
}

function OralQuestionsContent({ session }: { session: TimeSlot & { type: 'oral-questions' } }) {
  return (
    <div className="flex flex-col max-h-[400px] overflow-y-auto">
      <div className="p-4 border-b bg-muted">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm">{session.department}</h4>
            <SaveCalendarItemButton session={session} />
          </div>
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
      
      <div>
        {session.questions?.length ? (
          session.questions.map((question, index) => (
            <div key={index} className="p-4 border-b last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm mb-2">{question.text}</p>
                <SaveCalendarItemButton 
                  session={session}
                  item={{
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

function EDMContent({ session }: { session: TimeSlot & { type: 'edm'; edm: NonNullable<TimeSlot['edm']> } }) {
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
            <h4 className="font-medium text-sm">${session.edm.Title}</h4>
            <SaveCalendarItemButton session={session} />
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

function BillContent({ session }: { session: TimeSlot & { type: 'bill'; bill: NonNullable<TimeSlot['bill']> } }) {
  return (
    <div className="flex flex-col max-h-[400px] overflow-y-auto">
      <div className="p-4 border-b bg-muted">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm">{session.bill.title}</h4>
            <SaveCalendarItemButton session={session} />
          </div>
          <p className="text-xs text-muted-foreground">{session.bill.longTitle}</p>
          
          {/* House indicators */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full",
                session.bill.originatingHouse === "Commons" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {session.bill.originatingHouse}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full",
                session.bill.currentHouse === "Commons" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {session.bill.currentHouse}
              </span>
            </div>
            {session.bill.currentStage && (
              <span className="text-muted-foreground">
                {session.bill.currentStage.description}
                {session.bill.currentStage.abbreviation && ` (${session.bill.currentStage.abbreviation})`}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {session.bill.isAct && (
              <span className="text-xs text-green-600 font-medium">
                Enacted into law
              </span>
            )}
            {session.bill.isDefeated && (
              <span className="text-xs text-red-600 font-medium">
                Defeated
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {session.bill.summary && (
          <div>
            <h3 className="font-medium mb-2 text-sm">Summary</h3>
            <p className="text-sm text-muted-foreground">
              {session.bill.summary}
            </p>
          </div>
        )}
        
        {session.bill.sponsors && session.bill.sponsors.length > 0 && (
          <div>
            <h3 className="font-medium mb-2 text-sm">Sponsors</h3>
            <div className="space-y-2">
              {session.bill.sponsors.map((sponsor, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1"
                >
                  {sponsor.member && (
                    <>
                      <ProfileImage
                        src={sponsor.member.memberPhoto}
                        alt={sponsor.member.name}
                        size={24}
                        party={sponsor.member.party}
                      />
                      <div className="text-xs">
                        <span className="font-medium">{sponsor.member.name}</span>
                        <span className="text-muted-foreground ml-1">
                          {sponsor.member.memberFrom}
                        </span>
                        {sponsor.organisation && (
                          <span className="text-muted-foreground ml-1">
                            ({sponsor.organisation.name})
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayCell({ day, isToday }: { day: DaySchedule; isToday: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE_ITEMS = 5;
  
  const sortedTimeSlots = useMemo(() => {
    return day.timeSlots.sort((a, b) => {
      const timeA = a.time?.substantive || a.time?.topical || '';
      const timeB = b.time?.substantive || b.time?.topical || '';
      return timeA.localeCompare(timeB);
    });
  }, [day.timeSlots]);

  const visibleTimeSlots = showAll 
    ? sortedTimeSlots 
    : sortedTimeSlots.slice(0, MAX_VISIBLE_ITEMS);

  const hasMore = sortedTimeSlots.length > MAX_VISIBLE_ITEMS;

  return (
    <div className={cn(
      "min-h-[120px] p-2 border-t",
      isToday && "bg-primary/5"
    )}>
      <div className="text-sm font-medium mb-2">
        {format(day.date, 'EEEE d')}
      </div>
      
      <div className="space-y-1">
        {visibleTimeSlots.map((session, index) => (
          <SessionPopover
            key={`${session.type}-${index}`}
            session={session}
            size="normal"
          />
        ))}
        
        {hasMore && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(true)}
          >
            Show {sortedTimeSlots.length - MAX_VISIBLE_ITEMS} more items
          </Button>
        )}
        
        {showAll && hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(false)}
          >
            Show less
          </Button>
        )}
      </div>
    </div>
  );
}

