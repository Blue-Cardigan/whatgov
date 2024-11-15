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
import { motion, AnimatePresence } from 'framer-motion';

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
  readOnly = false,
  onExpandChange 
}: DebateCardProps) {
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const isCommonsDebate = debate.location.includes('Commons');
  const partyCount = debate.party_count as PartyCount;
  const keyPoints = debate.ai_key_points as KeyPoint[];
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [hasVoted, setHasVoted] = useState<Record<number, boolean>>({});
  
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

  // Get existing votes for this debate
  const existingVotes = queryClient.getQueryData<Map<string, Map<number, boolean>>>(['votes']);
  const debateVotes = existingVotes?.get(debate.id);

  // Handle voting and question progression
  const handleVote = async (questionNum: number, vote: boolean) => {
    await onVote?.(debate.id, questionNum, vote);
    setHasVoted(prev => ({ ...prev, [questionNum]: true }));
    
    // Automatically progress to next question after voting
    setTimeout(() => {
      if (questionNum < 3 && debate[`ai_question_${questionNum + 1}` as keyof FeedItem]) {
        setCurrentQuestion(questionNum + 1);
      }
    }, 500);
  };

  // Helper function to render a question with parliamentary styling
  const renderQuestion = (num: number) => {
    const question = debate[`ai_question_${num}` as keyof FeedItem] as string;
    if (!question) return null;
    
    const ayes = debate[`ai_question_${num}_ayes` as keyof FeedItem] as number;
    const noes = debate[`ai_question_${num}_noes` as keyof FeedItem] as number;
    const total = ayes + noes;
    const ayePercentage = total > 0 ? (ayes / total) * 100 : 50;
    const isVoting = queryClient.isMutating({ mutationKey: ['votes'] }) > 0;
    const userVote = debateVotes?.get(num);
    const isVisible = currentQuestion === num;

    return (
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "overflow-hidden",
              "space-y-4 p-4 rounded-lg",
              "border-2 dark:border-1",
              num === 1 ? "border-blue-200/50 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10" :
              num === 2 ? "border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10" :
              "border-amber-200/50 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10"
            )}
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn(
                "font-semibold text-xs",
                num === 1 ? "text-blue-700 dark:text-blue-400" :
                num === 2 ? "text-emerald-700 dark:text-emerald-400" :
                "text-amber-700 dark:text-amber-400"
              )}>
                Question {num} of {getTotalQuestions()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {total} votes
              </span>
            </div>

            <p className="text-sm font-medium">{question}</p>

            {/* Vote Results */}
            {hasVoted[num] && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ayePercentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-emerald-500"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(ayePercentage)}% Aye</span>
                  <span>{Math.round(100 - ayePercentage)}% No</span>
                </div>
              </motion.div>
            )}

            {/* Vote Buttons - Only show if current question and not voted */}
            {isVisible && !hasVoted[num] && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <Button
                  size="sm"
                  variant={userVote === true ? "default" : "outline"}
                  disabled={readOnly || isVoting}
                  className={cn(
                    "flex-1 relative overflow-hidden",
                    userVote === true
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-emerald-600 hover:bg-emerald-50"
                  )}
                  onClick={() => handleVote(num, true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  AYE
                </Button>
                <Button
                  size="sm"
                  variant={userVote === false ? "default" : "outline"}
                  disabled={readOnly || isVoting}
                  className={cn(
                    "flex-1 relative overflow-hidden",
                    userVote === false
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "border-rose-600 hover:bg-rose-50"
                  )}
                  onClick={() => handleVote(num, false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  NO
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Helper to get total number of questions
  const getTotalQuestions = () => {
    return [1, 2, 3].filter(num => 
      debate[`ai_question_${num}` as keyof FeedItem]
    ).length;
  };

  // Calculate total speakers with proper type safety
  const totalSpeakers = Object.values(partyCount || {}).reduce<number>((sum, count) => 
    sum + (count || 0), 
    0
  );
  
  // Party colors mapping
  const partyColors = {
    Conservative: "bg-[hsl(var(--party-conservative))]",
    Labour: "bg-[hsl(var(--party-labour))]",
    "Liberal Democrat": "bg-[hsl(var(--party-libdem))]",
    "Scottish National Party": "bg-[hsl(var(--party-snp))]",
    Other: "bg-muted"
  } as const;

  // Determine house based on location
  const getHouse = (location: string): 'Commons' | 'Lords' => {
    const lordsLocations = ['Grand Committee', 'Lords Chamber'];
    return lordsLocations.some(loc => location.includes(loc)) ? 'Lords' : 'Commons';
  };
  
  const house = getHouse(debate.location);

  return (
    <Card 
      ref={cardRef} 
      className={cn(
        "transition-colors duration-200",
        "hover:bg-muted/30 dark:hover:bg-muted/5",
        "border-x-0",
        "border-t-0",
        "border-b border-border/50 dark:border-border/30",
        "rounded-none",
        // Add subtle left border based on house
        house === 'Commons' 
          ? "border-l-2 border-l-emerald-500/20 dark:border-l-emerald-500/10" 
          : "border-l-2 border-l-red-500/20 dark:border-l-red-500/10",
        // Add subtle background tint based on house
        house === 'Commons'
          ? "bg-emerald-50/5 dark:bg-emerald-950/5"
          : "bg-red-50/5 dark:bg-red-950/5"
      )}
    >
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          {/* Metadata row */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(debate.date), 'dd MMM')}
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Building2 className={cn(
                "h-4 w-4",
                house === 'Commons' 
                  ? "text-emerald-500/70 dark:text-emerald-400/70" 
                  : "text-red-500/70 dark:text-red-400/70"
              )} />
              {debate.location.replace(' Chamber', '')}
            </div>
            {totalSpeakers > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Users2 className="h-4 w-4" />
                  {totalSpeakers} {totalSpeakers === 1 ? 'speaker' : 'speakers'}
                </div>
              </>
            )}
          </div>

          {/* Party proportions bar - only for Commons debates */}
          {isCommonsDebate && totalSpeakers > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {Object.entries(partyCount || {}).map(([party, count], index) => {
                  const width = (count || 0 / totalSpeakers) * 100;
                  if (width === 0) return null;
                  
                  return (
                    <motion.div
                      key={party}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ 
                        duration: 0.5, 
                        delay: index * 0.1,
                        ease: "easeOut" 
                      }}
                      className={cn(
                        "transition-all",
                        partyColors[party as keyof typeof partyColors] || partyColors.Other
                      )}
                    />
                  );
                })}
              </div>
              
              {/* Party legend */}
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(partyCount || {}).map(([party, count]) => {
                  if (count === 0) return null;
                  
                  return (
                    <div key={party} className="flex items-center gap-1">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        partyColors[party as keyof typeof partyColors] || partyColors.Other
                      )} />
                      <span className="text-muted-foreground">
                        {party} ({count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <CardTitle className="leading-tight">
            {debate.ai_title || debate.title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* First part of summary */}
        <motion.div
          className="prose prose-sm max-w-none"
          animate={{
            marginBottom: hasVoted[1] ? 0 : '1.5rem'
          }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-muted-foreground leading-relaxed">
            {debate.ai_summary.split('.').slice(0, 1).join('.')}.
          </p>
        </motion.div>
        
        {/* First question */}
        <motion.div
          animate={{
            marginBottom: hasVoted[1] ? 0 : '1.5rem',
            opacity: hasVoted[1] ? 0 : 1,
            height: hasVoted[1] ? 0 : 'auto'
          }}
          transition={{ duration: 0.3 }}
        >
          {renderQuestion(1)}
        </motion.div>
        
        {/* Second question */}
        <motion.div
          animate={{
            marginBottom: hasVoted[2] ? 0 : '1.5rem',
            opacity: hasVoted[2] ? 0 : 1,
            height: hasVoted[2] ? 0 : 'auto'
          }}
          transition={{ duration: 0.3 }}
        >
          {renderQuestion(2)}
        </motion.div>
        
        {/* Rest of summary */}
        <p className="text-muted-foreground">
          {debate.ai_summary.split('.').slice(1).join('.')} {/* Rest of the summary */}
        </p>
        
        {/* Third question */}
        {renderQuestion(3)}

        {/* Progress indicators - only show if there are unvoted questions */}
        <motion.div
          animate={{
            opacity: Object.keys(hasVoted).length === getTotalQuestions() ? 0 : 1,
            height: Object.keys(hasVoted).length === getTotalQuestions() ? 0 : 'auto'
          }}
          className="flex justify-center gap-2"
        >
          {[1, 2, 3].map(num => {
            const hasQuestion = debate[`ai_question_${num}` as keyof FeedItem];
            if (!hasQuestion || hasVoted[num]) return null;

            return (
              <motion.div
                key={num}
                className={cn(
                  "w-2 h-2 rounded-full",
                  currentQuestion === num ? "bg-primary" : "bg-muted"
                )}
                whileHover={{ scale: 1.2 }}
                onClick={() => setCurrentQuestion(num)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </motion.div>
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