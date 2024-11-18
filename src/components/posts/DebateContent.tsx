import type { FeedItem } from '@/types';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useCallback, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DebateContentProps {
  debate: FeedItem;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
  hasReachedLimit?: boolean;
}

export function DebateContent({ 
  debate, 
  onVote, 
  readOnly = false,
  hasReachedLimit = false 
}: DebateContentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [votedQuestions, setVotedQuestions] = useState<Set<number>>(new Set());
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
  const summary = useMemo(() => debate.ai_summary.split('.'), [debate.ai_summary]);

  const findNextUnansweredQuestion = useCallback((currentNum: number) => {
    for (let i = currentNum + 1; i <= 3; i++) {
      if (debate[`ai_question_${i}` as keyof FeedItem] && 
          !votedQuestions.has(i)) {
        return i;
      }
    }
    // If no questions after current, look for skipped questions
    for (let i = 1; i <= 3; i++) {
      if (debate[`ai_question_${i}` as keyof FeedItem] && 
          !votedQuestions.has(i)) {
        return i;
      }
    }
    return null;
  }, [debate, votedQuestions]);

  const progressToNextQuestion = useCallback((currentNum: number) => {
    setTimeout(() => {
      const nextUnanswered = findNextUnansweredQuestion(currentNum);
      if (nextUnanswered) setCurrentQuestion(nextUnanswered);
    }, 500);
  }, [findNextUnansweredQuestion]);

  const handleVote = useCallback(async (questionNum: number, vote: boolean) => {
    try {
      await onVote?.(debate.id, questionNum, vote);
      setVotedQuestions(prev => new Set(prev).add(questionNum));
      setSkippedQuestions(prev => {
        const next = new Set(prev);
        next.delete(questionNum);
        return next;
      });
      progressToNextQuestion(questionNum);
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  }, [debate.id, onVote, progressToNextQuestion]);

  const handleSkip = useCallback((questionNum: number) => {
    setSkippedQuestions(prev => new Set(prev).add(questionNum));
    progressToNextQuestion(questionNum);
  }, [progressToNextQuestion]);

  const handleReturnToQuestion = useCallback((questionNum: number) => {
    setCurrentQuestion(questionNum);
    setSkippedQuestions(prev => {
      const next = new Set(prev);
      next.delete(questionNum);
      return next;
    });
  }, []);

  return (
    <div className="w-full flex-none snap-center">
      <CardContent className="space-y-6">
        <DebateSummary firstPart={summary[0]} remainingPart={summary.slice(1).join('.')} />
        <QuestionsSection
          debate={debate}
          currentQuestion={currentQuestion}
          votedQuestions={votedQuestions}
          skippedQuestions={skippedQuestions}
          onVote={handleVote}
          onSkip={handleSkip}
          onReturnToQuestion={handleReturnToQuestion}
          readOnly={readOnly}
          hasReachedLimit={hasReachedLimit}
        />
      </CardContent>
    </div>
  );
}

function DebateSummary({ firstPart, remainingPart }: { firstPart: string, remainingPart: string }) {
  return (
    <motion.div 
      className="prose prose-sm max-w-none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-muted-foreground leading-relaxed">
        {firstPart}.
      </p>
      {remainingPart && (
        <p className="text-muted-foreground mt-4">
          {remainingPart}
        </p>
      )}
    </motion.div>
  );
}

function Question({ 
  number,
  question,
  isCurrentQuestion,
  hasVoted,
  wasSkipped,
  onVote,
  onSkip,
  onReturnToQuestion,
  readOnly,
  hasReachedLimit,
  totalQuestions
}: {
  number: number;
  question: string;
  isCurrentQuestion: boolean;
  hasVoted: boolean;
  wasSkipped: boolean;
  onVote: (num: number, vote: boolean) => void;
  onSkip: (num: number) => void;
  onReturnToQuestion: (num: number) => void;
  readOnly: boolean;
  hasReachedLimit: boolean;
  totalQuestions: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ 
        opacity: isCurrentQuestion ? 1 : hasVoted || wasSkipped ? 0.5 : 0,
        x: 0,
        height: hasVoted || wasSkipped || isCurrentQuestion ? 'auto' : 0
      }}
      whileHover={{ 
        opacity: wasSkipped ? 0.8 : undefined,
        scale: wasSkipped ? 1.01 : undefined
      }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-lg border overflow-hidden",
        isCurrentQuestion ? "bg-muted/50 shadow-sm" : "",
        wasSkipped ? "border-dashed cursor-pointer" : ""
      )}
      onClick={() => wasSkipped && onReturnToQuestion(number)}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Question {number} of {totalQuestions}
          </span>
          {wasSkipped && (
            <Badge 
              variant="outline" 
              className="text-xs bg-background/50"
            >
              Skipped - Click to answer
            </Badge>
          )}
        </div>
        
        <p className="text-sm">{question}</p>
        
        {isCurrentQuestion && !hasVoted && !readOnly && !hasReachedLimit && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <VoteButtons 
              onVote={onVote} 
              onSkip={onSkip}
              questionNumber={number} 
            />
          </motion.div>
        )}
      </div>
      
      {hasVoted && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground"
        >
          You&apos;ve voted on this question
        </motion.div>
      )}
    </motion.div>
  );
}

function VoteButtons({ 
  onVote, 
  onSkip,
  questionNumber 
}: { 
  onVote: (num: number, vote: boolean) => void;
  onSkip: (num: number) => void;
  questionNumber: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full relative overflow-hidden group"
          onClick={() => onVote(questionNumber, true)}
        >
          <motion.div
            className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100"
            initial={false}
            transition={{ duration: 0.2 }}
          />
          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
          Aye
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full relative overflow-hidden group"
          onClick={() => onVote(questionNumber, false)}
        >
          <motion.div
            className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100"
            initial={false}
            transition={{ duration: 0.2 }}
          />
          <XCircle className="mr-2 h-4 w-4 text-rose-500" />
          No
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={() => onSkip(questionNumber)}
      >
        Skip this question
      </Button>
    </div>
  );
}

function QuestionsSection({ 
  debate,
  currentQuestion,
  votedQuestions,
  skippedQuestions,
  onVote,
  onSkip,
  onReturnToQuestion,
  readOnly,
  hasReachedLimit
}: {
  debate: FeedItem;
  currentQuestion: number;
  votedQuestions: Set<number>;
  skippedQuestions: Set<number>;
  onVote: (num: number, vote: boolean) => void;
  onSkip: (num: number) => void;
  onReturnToQuestion: (num: number) => void;
  readOnly: boolean;
  hasReachedLimit: boolean;
}) {
  const questions = useMemo(() => 
    [1, 2, 3].filter(num => 
      debate[`ai_question_${num}` as keyof FeedItem]
    ), [debate]);

  const hasSkippedQuestions = skippedQuestions.size > 0;
  const allQuestionsAnswered = questions.every(num => 
    votedQuestions.has(num) || (!skippedQuestions.has(num) && num > currentQuestion)
  );

  return (
    <div className="space-y-4">
      {questions.map(num => (
        <Question
          key={num}
          number={num}
          question={debate[`ai_question_${num}` as keyof FeedItem] as string}
          isCurrentQuestion={currentQuestion === num}
          hasVoted={votedQuestions.has(num)}
          wasSkipped={skippedQuestions.has(num)}
          onVote={onVote}
          onSkip={onSkip}
          onReturnToQuestion={onReturnToQuestion}
          readOnly={readOnly}
          hasReachedLimit={hasReachedLimit}
          totalQuestions={questions.length}
        />
      ))}

      {hasSkippedQuestions && !allQuestionsAnswered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          Click any skipped question to return and answer it
        </motion.div>
      )}
    </div>
  );
} 