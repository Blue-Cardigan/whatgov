import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileImage } from "./SharedComponents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TimeSlot } from '@/types/calendar';
import { SaveCalendarItemButton } from './SaveCalendarItemButton';

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

function OralQuestionsContent({ session }: { session: TimeSlot & { type: 'oral-questions' } }) {
  return (
    <div className="p-4 pt-0">
      <div className="flex flex-col max-h-[400px] overflow-y-auto">
        <div className="p-4 border-b bg-muted">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm">{session.department}</h4>
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
            session.questions.map((question) => (
              <div key={question.id} className="p-4 border-b last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm mb-2">{question.text}</p>
                  <SaveCalendarItemButton
                    session={session}
                    question={question}
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
    </div>
  );
}
  
function EDMContent({ session }: { session: TimeSlot & { type: 'edm'; edm: NonNullable<TimeSlot['edm']> } }) {
  return (
    <div className="p-4 pt-0">
      <div className="flex flex-col max-h-[400px] overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <ProfileImage
              src={session.edm?.primarySponsor.photoUrl}
              alt={session.edm?.primarySponsor.name || 'Member'}
              size={40}
              party={session.edm?.primarySponsor.party}
            />
            <div>
              <h4 className="font-medium text-sm">{session.edm.title}</h4>
              <p className="text-xs text-muted-foreground">
                {session.edm?.primarySponsor.name}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-sm text-muted-foreground max-h-[200px] overflow-y-auto">
            {session.edm?.text}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventContent({ session }: { session: TimeSlot & { type: 'event'; event: EventContent } }) {
  return (
    <div className="p-4 pt-0">
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
          </div>
        </div>
  
        {/* Location */}
        <div className="p-4 space-y-3">
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
    </div>
  );
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
        case 'Oral evidence': return 'bg-lime-200 text-white border-lime-200 hover:bg-lime-200';
        case 'Debate': return 'bg-green-200 text-white border-green-200 hover:bg-green-200';
        case 'Short debate': return 'bg-green-200 text-white border-green-200 hover:bg-green-200';
        case 'Statement': return 'bg-cyan-200 text-white border-cyan-200 hover:bg-cyan-200';
        case 'Ministerial Statement': return 'bg-cyan-200 text-white border-cyan-200 hover:bg-cyan-200';
        case 'Westminster Hall debate': return 'bg-yellow-200 text-white border-yellow-200 hover:bg-yellow-200';
        case 'Backbench Business': return 'bg-amber-200 text-white border-amber-200 hover:bg-amber-200';
        case 'Introduction(s)': return 'bg-purple-200 text-white border-purple-200 hover:bg-purple-200';
        case 'Orders and Regulations': return 'bg-orange-200 text-white border-orange-200 hover:bg-orange-200';
        case 'Estimated rising time': return 'bg-orange-200 text-white border-orange-200 hover:bg-orange-200';
        case 'Private Members\' Bills': return 'bg-pink-200 text-white border-pink-200 hover:bg-pink-200';
        case 'Legislation': return 'bg-teal-200 text-white border-teal-200 hover:bg-teal-200';
        case 'Bills': return 'bg-indigo-200 text-white border-indigo-200 hover:bg-indigo-200';
        case 'EDMs': return 'bg-gray-200 text-white border-gray-200 hover:bg-gray-200';
        case 'Oral Questions': return 'bg-blue-200 text-white border-blue-200 hover:bg-blue-200';
        case 'Prime Minister': return 'bg-blue-200 text-white border-blue-200 hover:bg-blue-200';
        case 'Urgent question': return 'bg-cyan-200 text-white border-cyan-200 hover:bg-cyan-200';
        case 'Urgent Question Repeat': return 'bg-cyan-200 text-white border-cyan-200 hover:bg-cyan-200';
        case 'Adjournment': return 'bg-red-200 text-white border-red-200 hover:bg-red-200';
        case 'Ten Minute Rule Motion': return 'bg-purple-200 text-white border-purple-200 hover:bg-purple-200';
        case 'Motions': return 'bg-purple-200 text-white border-purple-200 hover:bg-purple-200';
        case 'Backbench Business': return 'bg-amber-200 text-white border-amber-200 hover:bg-amber-200';
        default: return 'bg-primary/90 text-white hover:bg-primary/80 border-primary-300';
      }
    }
    return 'bg-primary/90 text-white hover:bg-primary/80 border-primary-300';
  };

  // Helper function to format time
  const formatTimeString = (timeStr: string) => {
    // If timeStr is already in HH:mm format, return as is
    if (timeStr.length === 5) { // "HH:mm"
      return timeStr;
    }
    // If timeStr is ISO format, extract time portion
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr;
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
                    ? session.edm?.title
                    : ''}
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
                      ? session.edm?.title
                      : ''}
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
        <div className="space-y-2">
          {/* Header with save button */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="text-sm font-medium">
            <span className="text-muted-foreground">🕒 </span>
              {session.time?.substantive && formatTimeString(session.time.substantive)}
              {session.time?.topical && ` - ${formatTimeString(session.time.topical)}`}
            </div>
            <SaveCalendarItemButton session={session} />
          </div>

          {/* Event specific content */}
          {session.type === 'oral-questions' ? (
            <OralQuestionsContent session={session as TimeSlot & { type: 'oral-questions' } } />
          ) : session.type === 'edm' ? (
            <EDMContent session={session as TimeSlot & { type: 'edm'; edm: NonNullable<TimeSlot['edm']> } } />
          ) : (
            <EventContent session={session as TimeSlot & { type: 'event'; event: EventContent } } />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { OralQuestionsContent, EDMContent, EventContent };