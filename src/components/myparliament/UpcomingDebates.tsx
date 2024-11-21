'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { format, isThisWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { HansardAPI, OralQuestion } from "@/lib/hansard-api";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, User } from "lucide-react";

function ProfileImage({ 
  src, 
  alt, 
  size = 40,
  fallbackClassName = "" 
}: { 
  src?: string; 
  alt: string; 
  size?: number;
  fallbackClassName?: string;
}) {
  return (
    <div 
      className={`relative overflow-hidden rounded-full bg-muted ${fallbackClassName}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full"
          onError={(e) => {
            // Remove the errored image
            e.currentTarget.style.display = 'none';
            // Show the parent div with fallback
            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <User className="h-[60%] w-[60%] text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function UpcomingDebates() {
  const [questions, setQuestions] = useState<OralQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNextWeek, setShowNextWeek] = useState(false);

  useEffect(() => {
    async function fetchUpcomingQuestions() {
      try {
        setIsLoading(true);
        const data = await HansardAPI.getUpcomingOralQuestions(showNextWeek);
        setQuestions(data);
      } catch (err) {
        setError('Failed to load upcoming questions');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUpcomingQuestions();
  }, [showNextWeek]);

  const groupedQuestions = questions.reduce((acc, question) => {
    const date = new Date(question.AnsweringWhen);
    const isCurrentWeek = isThisWeek(date);
    
    if ((showNextWeek && !isCurrentWeek) || (!showNextWeek && isCurrentWeek)) {
      const key = `${format(date, 'yyyy-MM-dd')}-${question.AnsweringBody}`;
      if (!acc[key]) {
        acc[key] = {
          date,
          department: question.AnsweringBody,
          minister: question.AnsweringMinister,
          ministerTitle: question.AnsweringMinisterTitle,
          questionGroups: new Map()
        };
      }
      
      const questionKey = question.QuestionText;
      if (!acc[key].questionGroups.has(questionKey)) {
        acc[key].questionGroups.set(questionKey, {
          text: question.QuestionText,
          askingMembers: []
        });
      }
      acc[key].questionGroups.get(questionKey)!.askingMembers.push(question.AskingMember);
    }
    return acc;
  }, {} as Record<string, {
    date: Date;
    department: string;
    minister: OralQuestion['AnsweringMinister'];
    ministerTitle: string;
    questionGroups: Map<string, {
      text: string;
      askingMembers: OralQuestion['AskingMember'][];
    }>;
  }>);

  const sortedGroups = Object.values(groupedQuestions).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-destructive text-center">{error}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {showNextWeek ? "Next Week's Questions" : "This Week's Questions"}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNextWeek(!showNextWeek)}
          className="flex items-center gap-2"
        >
          {showNextWeek ? (
            <>
              <ChevronLeft className="h-4 w-4" />
              Show This Week
            </>
          ) : (
            <>
              Show Next Week
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {sortedGroups.map(({ date, department, minister, ministerTitle, questionGroups }) => (
        <Card key={`${date}-${department}`} className="overflow-hidden">
          <div className="bg-muted px-6 py-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ProfileImage
                  src={minister?.PhotoUrl}
                  alt={minister?.Name || 'Minister'}
                  size={40}
                />
                <div>
                  <h3 className="font-medium">{department}</h3>
                  <p className="text-sm text-muted-foreground">
                    {minister?.Name ? `${minister.Name} - ` : ''}{ministerTitle}
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {format(date, 'EEEE, d MMMM')}
              </span>
            </div>
          </div>
          
          <div className="divide-y">
            {Array.from(questionGroups.values()).map((group) => (
              <div 
                key={group.text} 
                className="p-3 hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm leading-snug mb-3">
                  {group.text}
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  {group.askingMembers.map((member, index) => (
                    <div 
                      key={`${member.Name}-${index}`}
                      className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-3 py-1"
                    >
                      <ProfileImage
                        src={member.PhotoUrl}
                        alt={member.Name}
                        size={24}
                        fallbackClassName="bg-transparent"
                      />
                      <span className="text-sm font-medium">
                        {member.Name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member.Party}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      
      {sortedGroups.length === 0 && (
        <Card className="p-6">
          <p className="text-muted-foreground text-center">
            No questions scheduled for {showNextWeek ? 'next' : 'this'} week
          </p>
        </Card>
      )}
    </div>
  );
} 