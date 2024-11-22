'use client';

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { HansardAPI, OralQuestion } from "@/lib/hansard-api";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, User2, ChevronDown, AlertCircle, Clock } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

function ProfileImage({ 
  src, 
  alt, 
  size = 40,
  fallbackClassName = "",
  party,
}: { 
  src?: string | null; 
  alt: string; 
  size?: number;
  fallbackClassName?: string;
  party?: string;
}) {
  const [imageError, setImageError] = useState(false);
  
  // Get initials from name
  const initials = alt
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Map party to background color
  const partyColors: Record<string, string> = {
    'Conservative': 'bg-blue-100 text-blue-700',
    'Labour': 'bg-red-100 text-red-700',
    'Scottish National Party': 'bg-yellow-100 text-yellow-700',
    'Liberal Democrat': 'bg-orange-100 text-orange-700',
    'Green Party': 'bg-green-100 text-green-700',
    'Independent': 'bg-gray-100 text-gray-700',
    'default': 'bg-muted text-muted-foreground'
  };

  const partyColor = party ? (partyColors[party] || partyColors.default) : partyColors.default;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-full flex items-center justify-center",
        !imageError && "bg-muted",
        imageError && partyColor,
        fallbackClassName
      )}
      style={{ width: size, height: size }}
    >
      {src && !imageError ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {size > 30 ? (
            // Show initials for larger avatars
            <span className="text-xs font-medium">{initials}</span>
          ) : (
            // Show icon for smaller avatars
            <User2 className="h-[60%] w-[60%]" />
          )}
        </div>
      )}
    </div>
  );
}

interface TimeSlot {
  department: string;
  minister: OralQuestion['AnsweringMinister'];
  ministerTitle: string;
  questions: {
    text: string;
    askingMembers: OralQuestion['AskingMember'][];
  }[];
}

interface DaySchedule {
  date: Date;
  timeSlots: TimeSlot[];
}

function EmptyState({ 
  showNextWeek, 
  onToggleWeek 
}: { 
  showNextWeek: boolean;
  onToggleWeek: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">
            No Questions Scheduled
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {showNextWeek ? (
              <>
                There are no oral questions scheduled for next week yet. Check back later or view this week's questions.
              </>
            ) : (
              <>
                There are no more oral questions scheduled for this week. Try checking next week's schedule.
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleWeek}
          className="flex items-center gap-2"
        >
          {showNextWeek ? (
            <>
              <ChevronLeft className="h-4 w-4" />
              View This Week
            </>
          ) : (
            <>
              View Next Week
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function SessionHeader({ 
  slot, 
  totalQuestions 
}: { 
  slot: TimeSlot;
  totalQuestions: number;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
      <div className="flex items-center gap-3">
        <ProfileImage
          src={slot.minister?.PhotoUrl}
          alt={slot.minister?.Name || 'Minister'}
          party={slot.minister?.Party}
          size={36}
        />
        <div>
          <h4 className="font-medium text-sm leading-tight">{slot.department}</h4>
          <p className="text-xs text-muted-foreground leading-tight">
            {slot.minister?.Name ? `${slot.minister.Name} - ` : ''}{slot.ministerTitle}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="ml-auto">
        {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
}

function QuestionCard({ 
  question, 
  index 
}: { 
  question: TimeSlot['questions'][0];
  index: number;
}) {
  return (
    <div className="p-4 bg-card rounded-lg border space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
          {index + 1}
        </div>
        <p className="text-sm leading-6">{question.text}</p>
      </div>
      <div className="flex flex-wrap gap-2 pl-9">
        {question.askingMembers.map((member, mIndex) => (
          <div 
            key={`${member.Name}-${mIndex}`}
            className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted transition-colors rounded-full pl-1 pr-2.5 py-0.5"
          >
            <ProfileImage
              src={member.PhotoUrl}
              alt={member.Name}
              party={member.Party}
              size={20}
              fallbackClassName="bg-transparent"
            />
            <span className="text-xs font-medium">{member.Name}</span>
            <span className="text-xs text-muted-foreground">({member.Party})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayHeader({
  date,
  sessionCount,
  questionCount,
  isExpanded,
  sessions,
}: {
  date: Date;
  sessionCount: number;
  questionCount: number;
  isExpanded: boolean;
  sessions: {
    department: string;
    minister: OralQuestion['AnsweringMinister'];
    questionCount: number;
  }[];
}) {
  return (
    <div className="flex flex-col gap-2 p-4 hover:bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="uppercase">
            {format(date, 'EEEE')}
          </Badge>
          <span className="font-medium">
            {format(date, 'd MMMM')}
          </span>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {sessionCount} Session{sessionCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {questionCount} Question{questionCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </div>

      {!isExpanded && sessions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {sessions.map((session, index) => (
            <div 
              key={`${session.department}-${index}`}
              className="flex items-center gap-2 bg-muted/30 rounded-lg p-2"
            >
              <ProfileImage
                src={session.minister?.PhotoUrl}
                alt={session.minister?.Name || 'Minister'}
                size={28}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">
                  {session.department}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {session.minister?.Name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UpcomingDebates() {
  const [requestedWeek, setRequestedWeek] = useState<'current' | 'next'>('current');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [autoSwitchedToNext, setAutoSwitchedToNext] = useState(false);
  
  const queryClient = useQueryClient();

  // Use React Query's built-in caching
  const currentWeekQuery = useQuery({
    queryKey: ['upcomingDebates', 'current'],
    queryFn: () => HansardAPI.getUpcomingOralQuestions(false),
    staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: 2, // Retry failed requests twice
  });

  const nextWeekQuery = useQuery({
    queryKey: ['upcomingDebates', 'next'],
    queryFn: () => HansardAPI.getUpcomingOralQuestions(true),
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Prefetch optimization
  const prefetchNextWeek = useCallback(() => {
    if (requestedWeek === 'current') {
      queryClient.prefetchQuery({
        queryKey: ['upcomingDebates', 'next'],
        queryFn: () => HansardAPI.getUpcomingOralQuestions(true),
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [queryClient, requestedWeek]);

  // 4. Determine which data to show
  const { data, isLoading, error, actualWeek } = useMemo(() => {
    // If current week is requested but empty and next week has data, auto-switch
    if (requestedWeek === 'current' && 
        !currentWeekQuery.isLoading && 
        currentWeekQuery.data?.length === 0 && 
        nextWeekQuery.data?.length !== undefined && 
        nextWeekQuery.data?.length > 0 && 
        !autoSwitchedToNext) {
      setAutoSwitchedToNext(true);
      return {
        data: nextWeekQuery.data,
        isLoading: false,
        error: null,
        actualWeek: 'next'
      };
    }

    const query = requestedWeek === 'current' ? currentWeekQuery : nextWeekQuery;
    return {
      data: query.data,
      isLoading: query.isLoading,
      error: query.error,
      actualWeek: requestedWeek
    };
  }, [requestedWeek, currentWeekQuery.data, nextWeekQuery.data, 
      currentWeekQuery.isLoading, nextWeekQuery.isLoading, autoSwitchedToNext]);

  // 6. Event handlers
  const toggleWeek = () => {
    setAutoSwitchedToNext(false);
    setRequestedWeek(prev => prev === 'current' ? 'next' : 'current');
    setExpandedDays(new Set());
  };

  // Auto-expand first day if it's the only one
  const schedule = useMemo(() => {
    if (!data) return [];

    const processed = processScheduleData(data); // Move data processing to separate function
    
    // If there's only one day, auto-expand it
    if (processed.length === 1) {
      const dateKey = format(processed[0].date, 'yyyy-MM-dd');
      if (!expandedDays.has(dateKey)) {
        setExpandedDays(new Set([dateKey]));
      }
    }
    
    return processed;
  }, [data, expandedDays]);

  // 7. Render functions
  const renderHeader = () => (
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {actualWeek === 'next' ? "Next Week's Questions" : "This Week's Questions"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Scheduled oral questions in the House of Commons
          {autoSwitchedToNext && requestedWeek === 'current' && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-amber-500 font-medium">
              <AlertCircle className="h-4 w-4" />
              No more questions this week - showing next week's schedule
            </span>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleWeek}
        onMouseEnter={prefetchNextWeek}
        className="flex items-center gap-2 min-w-[140px] justify-center"
        disabled={isLoading}
      >
        {isLoading ? (
          <span>Loading...</span>
        ) : actualWeek === 'next' ? (
          <>
            <ChevronLeft className="h-4 w-4" />
            View This Week
          </>
        ) : (
          <>
            View Next Week
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(dateKey)) {
        newExpanded.delete(dateKey);
      } else {
        newExpanded.add(dateKey);
      }
      return newExpanded;
    });
  };

  // 8. Loading state with skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {renderHeader()}
        <Card className="divide-y">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-24 h-6 bg-muted rounded-md animate-pulse" />
                <div className="w-32 h-6 bg-muted rounded-md animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="w-full h-12 bg-muted rounded-lg animate-pulse" />
                <div className="w-3/4 h-12 bg-muted rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-red-600">Error Loading Questions</h2>
            <p className="text-sm text-muted-foreground">
              Failed to fetch the oral questions schedule
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['upcomingDebates'] })}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState 
        showNextWeek={requestedWeek === 'next'} 
        onToggleWeek={toggleWeek} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {renderHeader()}

      {schedule.length > 0 ? (
        <div className="space-y-3">
          {schedule.map((day) => {
            const dateKey = format(day.date, 'yyyy-MM-dd');
            const isExpanded = expandedDays.has(dateKey);
            const totalQuestions = day.timeSlots.reduce(
              (sum, slot) => sum + slot.questions.length, 
              0
            );

            // Prepare session summaries for the header
            const sessionSummaries = day.timeSlots.map(slot => ({
              department: slot.department,
              minister: slot.minister,
              questionCount: slot.questions.length
            }));

            return (
              <Collapsible
                key={dateKey}
                open={isExpanded}
                onOpenChange={() => toggleDay(dateKey)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <DayHeader
                      date={day.date}
                      sessionCount={day.timeSlots.length}
                      questionCount={totalQuestions}
                      isExpanded={isExpanded}
                      sessions={sessionSummaries}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="divide-y border-t">
                      {day.timeSlots
                        .sort((a, b) => a.department.localeCompare(b.department))
                        .map((slot, index) => (
                          <div key={`${slot.department}-${index}`} className="p-4 space-y-3">
                            <SessionHeader 
                              slot={slot} 
                              totalQuestions={slot.questions.length} 
                            />
                            <div className="pl-3 space-y-3">
                              {slot.questions.map((question, qIndex) => (
                                <QuestionCard
                                  key={qIndex}
                                  question={question}
                                  index={qIndex}
                                />
                              ))}
                            </div>
                          </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <EmptyState 
          showNextWeek={requestedWeek === 'next'} 
          onToggleWeek={toggleWeek} 
        />
      )}
    </div>
  );
}

// Helper function to process schedule data
function processScheduleData(data: OralQuestion[]): DaySchedule[] {
  const dayMap = new Map<string, DaySchedule>();

  data.forEach((question: OralQuestion) => {
    const date = new Date(question.AnsweringWhen);
    const dateKey = format(date, 'yyyy-MM-dd');

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date,
        timeSlots: []
      });
    }

    const day = dayMap.get(dateKey)!;
    let timeSlot = day.timeSlots.find(slot => 
      slot.department === question.AnsweringBody
    );

    if (!timeSlot) {
      timeSlot = {
        department: question.AnsweringBody,
        minister: question.AnsweringMinister,
        ministerTitle: question.AnsweringMinisterTitle,
        questions: []
      };
      day.timeSlots.push(timeSlot);
    }

    const existingQuestion = timeSlot.questions.find(q => 
      q.text === question.QuestionText
    );

    if (existingQuestion) {
      existingQuestion.askingMembers.push(question.AskingMember);
    } else {
      timeSlot.questions.push({
        text: question.QuestionText,
        askingMembers: [question.AskingMember]
      });
    }
  });

  return Array.from(dayMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
} 