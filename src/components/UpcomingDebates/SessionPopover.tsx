import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileImage } from "./SharedComponents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DaySchedule, TimeSlot } from '@/types/calendar';
import { SaveCalendarItemButton } from './SaveCalendarItemButton';
import { useMemo } from "react";
import { useState } from "react";

interface SessionPopoverProps {
  session: TimeSlot;
  size?: 'compact' | 'normal';
  style?: React.CSSProperties;
}

interface EventContent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  category?: string;
  house?: string;
  type?: string;
  member?: {
    id: number;
    name: string;
    party: string;
    memberFrom: string;
    partyColour: string;
    photoUrl: string;
  };
}

export function SessionPopover({ session, size = 'normal', style }: SessionPopoverProps) {
  // Get appropriate icon based on event type
  const getEventIcon = () => {
    switch (session.type) {
      case 'oral-questions':
        return '❓';
      case 'event':
        switch (session.event?.type) {
          case 'Main Chamber': return '🏛️';
          case 'Debate': return '🗣️';
          case 'Westminster Hall Debate': return '🏪🏪';
          case 'General Committee': return '📋';
          case 'Oral Evidence': return '💬';
          case 'Private Meeting': return '🔒';
          case 'Ministerial Statement': return '📢';
          case 'Backbench Business': return '💺';
          default: return '📅';
        }
      case 'bill':
        return '📜';
      case 'edm':
        return '📢';
      default:
        return '📅';
    }
  };

  // Enhanced getEventColor function with bolder colors
  const getEventColor = () => {
    if (session.type === 'event') {
      switch (session.event?.category) {
        case 'Private Meeting': return 'bg-blue-600/90 text-white border-blue-300 hover:bg-blue-500';
        case 'Ministerial statement': return 'bg-purple-600/90 text-white border-purple-300 hover:bg-purple-500';
        case 'Westminster Hall debate': return 'bg-green-600/90 text-white border-green-300 hover:bg-green-500';
        case 'Backbench Business': return 'bg-orange-600/90 text-white border-orange-300 hover:bg-orange-500';
        default: return 'bg-primary/90 text-white hover:bg-primary/80 border-primary-300';
      }
    }
    return 'bg-primary/90 text-white hover:bg-primary/80 border-primary-300';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "group relative",
            size === 'compact' 
              ? cn(
                  getEventColor(),
                  "rounded-md border shadow-sm",
                  "min-h-[40px] p-1.5"
                )
              : "w-full justify-start rounded-md hover:bg-primary/5 p-2",
            "text-left overflow-hidden transition-all duration-200"
          )}
          style={{
            ...style,
            backgroundImage: size === 'compact' ? 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2))' : undefined,
          }}
        >
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center justify-between">
              {session.time?.substantive && (
                <span className="text-[11px] font-medium text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded-sm">
                  {session.time.substantive}
                  {session.time.topical && ` - ${session.time.topical}`}
                </span>
              )}
              <span className="text-base opacity-70">{getEventIcon()}</span>
            </div>
            
            <div className="flex items-center gap-2 min-w-0">
              {(session.type === 'event' && session.event?.members?.[0]?.photoUrl) ? (
                <div className="flex-shrink-0">
                  <ProfileImage
                    src={session.event.members?.[0]?.photoUrl}
                    alt={session.event.members?.[0]?.name || ''}
                    size={size === 'compact' ? 22 : 24}
                    party={session.event.members?.[0]?.party}
                  />
                </div>
              ) : session.type === 'oral-questions' && session.minister?.PhotoUrl ? (
                <div className="flex-shrink-0">
                  <ProfileImage
                    src={session.minister.PhotoUrl}
                    alt={session.minister.Name}
                    size={size === 'compact' ? 22 : 24}
                  />
                </div>
              ) : null}
              
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium truncate leading-tight",
                  size === 'compact' ? 'text-xs' : 'text-sm'
                )}>
                  {session.type === 'event' 
                    ? session.event?.title
                    : session.type === 'oral-questions'
                    ? session.department
                    : session.type === 'edm'
                    ? 'Early Day Motion'
                    : session.bill?.title}
                </div>
                {size === 'normal' && (
                  <div className="text-[11px] truncate text-muted-foreground mt-0.5">
                    {session.type === 'event' 
                      ? (
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          {session.event?.location || session.event?.category}
                        </div>
                      )
                      : session.type === 'oral-questions'
                      ? `${session.questions?.length || 0} questions`
                      : session.type === 'edm'
                      ? session.edm?.Title
                      : session.bill && (
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px]",
                            session.bill.currentHouse === "Commons" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          )}>
                            {session.bill.currentHouse}
                          </span>
                          <span>{session.bill.currentStage?.description || ''}</span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-[inherit]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 rounded-lg shadow-lg border-gray-200" 
      >
        {session.type === 'oral-questions' ? (
          <OralQuestionsContent session={session as TimeSlot & { type: 'oral-questions' } } />
        ) : session.type === 'edm' ? (
          <EDMContent session={session as TimeSlot & { type: 'edm'; edm: NonNullable<TimeSlot['edm']> } } />
        ) : session.type === 'bill' ? (
          <BillContent session={session as TimeSlot & { type: 'bill'; bill: NonNullable<TimeSlot['bill']> } } />
        ) : (
          <EventContent session={session as TimeSlot & { type: 'event'; event: EventContent } } />
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
  
  function EventContent({ session }: { session: TimeSlot & { type: 'event'; event: EventContent } }) {
    return (
      <div className="flex flex-col divide-y">
        {/* Header */}
        <div className="p-4 bg-muted">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium text-sm">{session.event?.title}</h4>
              {session.event.type && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10">
                  {session.event.type}
                </span>
              )}
            </div>
            <SaveCalendarItemButton session={session} />
          </div>
        </div>
  
        {/* Time and Location */}
        <div className="p-4 space-y-3">
          {(session.time?.substantive || session.time?.topical) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">🕒</span>
              <div>
                {session.time.substantive && (
                  <div>Starts: {session.time.substantive}</div>
                )}
                {session.time.topical && (
                  <div>Ends: {session.time.topical}</div>
                )}
              </div>
            </div>
          )}
  
          {session.event.location && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">📍</span>
              <div>{session.event.location}</div>
            </div>
          )}
        </div>
  
        {/* Description and Categories */}
        {(session.event.description || session.event.category || session.event.house) && (
          <div className="p-4 space-y-3">
            {session.event.description && (
              <p className="text-sm text-muted-foreground">
                {session.event.description}
              </p>
            )}
  
            <div className="flex flex-wrap gap-2">
              {session.event.category && (
                <span className="text-xs bg-muted px-2 py-1 rounded-full">
                  {session.event.category}
                </span>
              )}
              {session.event.house && (
                <span className="text-xs bg-muted px-2 py-1 rounded-full">
                  {session.event.house}
                </span>
              )}
            </div>
          </div>
        )}
  
        {/* Member Information */}
        {session.event.member && (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <ProfileImage
                src={session.event.member.photoUrl}
                alt={session.event.member.name}
                size={40}
                party={session.event.member.party}
              />
              <div>
                <div className="font-medium text-sm">
                  {session.event.member.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {session.event.member.memberFrom}
                </div>
              </div>
            </div>
          </div>
        )}
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