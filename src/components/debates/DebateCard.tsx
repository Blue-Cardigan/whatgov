'use client';

import { FeedItem, KeyPoint, PartyCount } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CalendarIcon, Users2, MessageSquare, Building2, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface DebateCardProps {
  debate: FeedItem;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  votes?: Map<string, Map<number, boolean>>;
  readOnly?: boolean;
}

export function DebateCard({ debate, onVote, votes, readOnly = false }: DebateCardProps) {
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);
  const partyCount = debate.party_count as PartyCount;
  const keyPoints = debate.ai_key_points as KeyPoint[];
  
  const totalSpeakers = Object.values(partyCount || {}).reduce((sum, count) => sum + count, 0);

  // Helper function to render a question with parliamentary styling
  const renderQuestion = (num: number) => {
    const question = debate[`ai_question_${num}` as keyof FeedItem] as string;
    const ayes = debate[`ai_question_${num}_ayes` as keyof FeedItem] as number;
    const noes = debate[`ai_question_${num}_noes` as keyof FeedItem] as number;
    const total = ayes + noes;
    const ayePercentage = total > 0 ? (ayes / total) * 100 : 50;
    
    const queryClient = useQueryClient();
    const isVoting = queryClient.isMutating({ mutationKey: ['votes'] }) > 0;
    
    if (!question) return null;
    
    return (
      <div className="space-y-2">
        <p className="text-sm">{question}</p>
        
        {/* Votes display */}
        <div className="space-y-2">
          {/* Proportion bar with transition */}
          <div className="h-2 flex rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-green-600 transition-all duration-300"
              style={{ width: `${ayePercentage}%` }}
            />
            <div 
              className="bg-red-600 transition-all duration-300"
              style={{ width: `${100 - ayePercentage}%` }}
            />
          </div>
          
          {/* Modified vote buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={votes?.get(debate.id)?.get(num) === true ? "default" : "outline"}
              disabled={readOnly || isVoting}
              className={cn(
                "flex-1",
                votes?.get(debate.id)?.get(num) === true
                  ? "bg-green-600 hover:bg-green-700 text-white border-0"
                  : "border-green-600 hover:bg-green-50",
                "font-semibold tracking-wide transition-all duration-200",
                isVoting && "opacity-70"
              )}
              onClick={() => onVote?.(debate.id, num, true)}
            >
              <ThumbsUp className={cn(
                "h-4 w-4 mr-2",
                isVoting && "animate-pulse"
              )} />
              AYE ({ayes})
            </Button>
            <Button
              size="sm"
              variant={votes?.get(debate.id)?.get(num) === false ? "default" : "outline"}
              disabled={readOnly || isVoting}
              className={cn(
                "flex-1",
                votes?.get(debate.id)?.get(num) === false
                  ? "bg-red-600 hover:bg-red-700 text-white border-0"
                  : "border-red-600 hover:bg-red-50",
                "font-semibold tracking-wide transition-all duration-200",
                isVoting && "opacity-70"
              )}
              onClick={() => onVote?.(debate.id, num, false)}
            >
              <ThumbsDown className={cn(
                "h-4 w-4 mr-2",
                isVoting && "animate-pulse"
              )} />
              NO ({noes})
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-4 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(debate.date), 'PPP')}
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {debate.location}
          </div>
        </div>
        <CardTitle className="hover:text-primary cursor-pointer mb-4">
          {debate.ai_title || debate.title}
        </CardTitle>
        
        {/* First question right after title */}
        <div className="mt-4">
          {renderQuestion(1)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Split summary and add second question in between */}
        <p className="text-muted-foreground">
          {debate.ai_summary.split('.').slice(0, 1).join('.')}. {/* First two sentences */}
        </p>
        
        {renderQuestion(2)}
        
        <p className="text-muted-foreground">
          {debate.ai_summary.split('.').slice(1).join('.')} {/* Rest of the summary */}
        </p>
        
        {/* Party Proportions Bar */}
        {partyCount && (
          <div>
            <h4 className="text-sm font-medium mb-2">Party Participation</h4>
            <div className="h-4 flex rounded-full overflow-hidden">
              {Object.entries(partyCount).map(([party, count], index) => {
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

      <CardFooter className="flex flex-col gap-4">
        <div className="w-full">
          <Button
            variant="ghost"
            className="w-full flex justify-between items-center py-2 hover:bg-muted/50 transition-colors"
            onClick={() => setShowKeyPoints(!showKeyPoints)}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users2 className="h-4 w-4" />
                {debate.speaker_count} speakers
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {debate.contribution_count} contributions
              </div>
            </div>
            <div className="flex items-center gap-2">
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
          </Button>
          
          {showKeyPoints && (
            <div className="relative mt-4 animate-in slide-in-from-top-4 duration-200">
              {/* Fade out effect at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
              
              {/* Scrollable container */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent pr-4">
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
                              setExpandedPoint(expandedPoint === index ? null : index);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {point.support.length > 0 && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <ThumbsUp className="h-3 w-3" />
                                  {point.support.length}
                                </span>
                              )}
                              {point.opposition.length > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <ThumbsDown className="h-3 w-3" />
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
                              <span className="text-green-600 font-medium mb-1 flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" /> Support
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
                              <span className="text-red-600 font-medium mb-1 flex items-center gap-1">
                                <ThumbsDown className="h-3 w-3" /> Opposition
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