'use client';

import { FeedItem, KeyPoint, PartyCount } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CalendarIcon, Users2, MessageSquare, Building2, ChevronDown, ChevronUp, CheckCircle2, XCircle, CircleDot, CircleSlash } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface DebateCardProps {
  debate: FeedItem;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  votes?: Map<string, Map<number, boolean>>;
  readOnly?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
  isExpanded?: boolean;
}

export function DebateCard({ 
  debate, 
  onVote, 
  votes, 
  readOnly = false,
  onExpandChange 
}: DebateCardProps) {
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const partyCount = debate.party_count as PartyCount;
  const keyPoints = debate.ai_key_points as KeyPoint[];
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const totalSpeakers = Object.values(partyCount || {}).reduce((sum, count) => sum + count, 0);

  // Notify parent of expansion state changes
  useEffect(() => {
    onExpandChange?.(showKeyPoints);
  }, [showKeyPoints, onExpandChange]);

  // Handle height changes from animations
  useEffect(() => {
    if (!cardRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      // Let the animation complete before measuring
      setTimeout(() => {
        const entry = entries[0];
        if (entry && entry.target === cardRef.current) {
          // Force parent to remeasure
          cardRef.current.dispatchEvent(new Event('resize'));
        }
      }, 300); // Adjust timing based on your animation duration
    });
    
    resizeObserver.observe(cardRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle key point expansion
  const handleKeyPointExpand = (index: number) => {
    setExpandedPoint(expandedPoint === index ? null : index);
    // Force remeasure after animation
    setTimeout(() => {
      cardRef.current?.dispatchEvent(new Event('resize'));
    }, 300);
  };

  // Helper function to render a question with parliamentary styling
  const renderQuestion = (num: number) => {
    const question = debate[`ai_question_${num}` as keyof FeedItem] as string;
    const ayes = debate[`ai_question_${num}_ayes` as keyof FeedItem] as number;
    const noes = debate[`ai_question_${num}_noes` as keyof FeedItem] as number;
    const total = ayes + noes;
    const ayePercentage = total > 0 ? (ayes / total) * 100 : 50;
    
    const isVoting = queryClient.isMutating({ mutationKey: ['votes'] }) > 0;
    
    if (!question) return null;
    
    return (
      <div className={cn(
        "space-y-3 p-4 rounded-lg transition-all duration-200",
        "border-2 dark:border-1",
        num === 1 ? "border-blue-200/50 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10" :
        num === 2 ? "border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10" :
        "border-amber-200/50 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10",
        "hover:bg-background/80 dark:hover:bg-background/20"
      )}>
        {/* Question header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn(
            "font-semibold text-xs",
            num === 1 ? "border-blue-200 dark:border-blue-500 text-blue-700 dark:text-blue-400" :
            num === 2 ? "border-emerald-200 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400" :
            "border-amber-200 dark:border-amber-500 text-amber-700 dark:text-amber-400"
          )}>
            Question {num}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {total} votes
          </span>
        </div>
        
        <p className="text-sm font-medium">{question}</p>
        
        {/* Votes display */}
        <div className="space-y-3">
          {/* Enhanced proportion bar */}
          <div className="h-3 flex rounded-full overflow-hidden bg-muted/50 dark:bg-muted/20">
            <div 
              className={cn(
                "transition-all duration-300",
                "bg-gradient-to-r from-emerald-500/90 to-emerald-600/90",
                "dark:from-emerald-600/90 dark:to-emerald-700/90"
              )}
              style={{ width: `${ayePercentage}%` }}
            />
            <div 
              className={cn(
                "transition-all duration-300",
                "bg-gradient-to-r from-rose-500/90 to-rose-600/90",
                "dark:from-rose-600/90 dark:to-rose-700/90"
              )}
              style={{ width: `${100 - ayePercentage}%` }}
            />
          </div>

          {/* Vote counts */}
          <div className="flex justify-between text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              Ayes: {ayes}
            </span>
            <span className="text-rose-700 dark:text-rose-400 font-medium">
              Noes: {noes}
            </span>
          </div>
          
          {/* Modified vote buttons */}
          <div className="flex gap-3">
            <Button
              size="sm"
              variant={votes?.get(debate.id)?.get(num) === true ? "default" : "outline"}
              disabled={readOnly || isVoting}
              className={cn(
                "flex-1 relative overflow-hidden",
                votes?.get(debate.id)?.get(num) === true
                  ? "bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-white border-0"
                  : "border-emerald-600 dark:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                "font-semibold tracking-wide transition-all duration-200"
              )}
              onClick={() => onVote?.(debate.id, num, true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              AYE
              {votes?.get(debate.id)?.get(num) === true && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
            </Button>
            <Button
              size="sm"
              variant={votes?.get(debate.id)?.get(num) === false ? "default" : "outline"}
              disabled={readOnly || isVoting}
              className={cn(
                "flex-1 relative overflow-hidden",
                votes?.get(debate.id)?.get(num) === false
                  ? "bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-800 text-white border-0"
                  : "border-rose-600 dark:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30",
                "font-semibold tracking-wide transition-all duration-200"
              )}
              onClick={() => onVote?.(debate.id, num, false)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              NO
              {votes?.get(debate.id)?.get(num) === false && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card 
      ref={cardRef} 
      className={cn(
        "border transition-colors duration-200",
        "hover:bg-muted/30 dark:hover:bg-muted/5",
        "border-border/50 dark:border-border/30"
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(debate.date), 'dd MMM')}
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {debate.location.replace(' Chamber', '')}
          </div>
        </div>
        <CardTitle className="hover:text-primary cursor-pointer mb-4">
          {debate.ai_title || debate.title}
        </CardTitle>
        
        {/* Move first question outside content for emphasis */}
        <div className="mt-6">
          {renderQuestion(1)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reorganize content for better flow */}
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed">
            {debate.ai_summary.split('.').slice(0, 1).join('.')}.
          </p>
        </div>
        
        {renderQuestion(2)}
        
        <p className="text-muted-foreground">
          {debate.ai_summary.split('.').slice(1).join('.')} {/* Rest of the summary */}
        </p>
        
        {/* Party Proportions Bar */}
        {partyCount && (
          <div>
            <h4 className="text-sm font-medium mb-2">Party Participation</h4>
            <div className="h-4 flex rounded-full overflow-hidden">
              {Object.entries(partyCount).map(([party, count]) => {
                const proportion = (count / totalSpeakers) * 100;
                const colors: { [key: string]: string } = {
                  'Labour': 'bg-red-500',
                  'Conservative': 'bg-blue-500',
                  'Liberal Democrat': 'bg-yellow-500',
                  'Scottish National Party': 'bg-yellow-400',
                  'Green Party': 'bg-green-500',
                  'Speaker': 'bg-gray-500',
                  'Labour (Co-op)': 'bg-red-400',
                  'Democratic Unionist Party': 'bg-purple-500'
                };
                
                return (
                  <div
                    key={party}
                    className={cn(
                      colors[party] || 'bg-gray-400',
                      'h-full hover:opacity-80 transition-opacity'
                    )}
                    style={{ width: `${proportion}%` }}
                    title={`${party}: ${count} speakers (${proportion.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        {/* Third question after party participation */}
        {renderQuestion(3)}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 px-2">
        <div className="w-full">
          <Button
            variant="ghost"
            className="w-full flex justify-between items-center py-2 hover:bg-muted/50 transition-colors"
            onClick={() => setShowKeyPoints(!showKeyPoints)}
          >
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex items-center gap-1">
                  <Users2 className="h-4 w-4" />
                  {debate.speaker_count} speakers
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {debate.contribution_count} contributions
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 ml-auto">
                <Badge variant={
                  debate.ai_tone === 'contentious' ? 'destructive' : 
                  debate.ai_tone === 'collaborative' ? 'success' : 
                  'secondary'
                }>
                  {debate.ai_tone}
                </Badge>
                {showKeyPoints ? (
                  <ChevronUp className="h-4 w-4 transition-transform" />
                ) : (
                  <ChevronDown className="h-4 w-4 transition-transform" />
                )}
              </div>
            </div>
          </Button>
          
          {showKeyPoints && (
            <div 
              ref={contentRef}
              className="relative mt-4 animate-in slide-in-from-top-4 duration-200"
            >
              {/* Fade out effect at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
              
              {/* Scrollable container - adjusted padding for mobile */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-2 sm:pr-4">
                <h4 className="text-sm font-bold mb-2">Key Points</h4>
                {keyPoints.map((point, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200",
                      "hover:bg-muted/50 hover:shadow-sm",
                      "group cursor-default"
                    )}
                  >
                    <p className="text-sm leading-relaxed group-hover:text-primary transition-colors">
                      {point.point}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {point.speaker}
                        </span>
                        {(point.support.length > 0 || point.opposition.length > 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKeyPointExpand(index);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {point.support.length > 0 && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <CircleDot className="h-3 w-3" />
                                  {point.support.length}
                                </span>
                              )}
                              {point.opposition.length > 0 && (
                                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                  <CircleSlash className="h-3 w-3" />
                                  {point.opposition.length}
                                </span>
                              )}
                            </div>
                          </Button>
                        )}
                      </div>
                      
                      {/* Expandable support/opposition details */}
                      {expandedPoint === index && (point.support.length > 0 || point.opposition.length > 0) && (
                        <div className="pl-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          {point.support.length > 0 && (
                            <div className="text-xs">
                              <span className="text-emerald-600 font-medium mb-1 flex items-center gap-1">
                                <CircleDot className="h-3 w-3" /> Support
                              </span>
                              <div className="pl-4 space-y-1 mt-1">
                                {point.support.map((speaker, i) => (
                                  <span key={i} className="block text-muted-foreground">
                                    {speaker}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {point.opposition.length > 0 && (
                            <div className="text-xs">
                              <span className="text-rose-600 font-medium mb-1 flex items-center gap-1">
                                <CircleSlash className="h-3 w-3" /> Opposition
                              </span>
                              <div className="pl-4 space-y-1 mt-1">
                                {point.opposition.map((speaker, i) => (
                                  <span key={i} className="block text-muted-foreground">
                                    {speaker}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 