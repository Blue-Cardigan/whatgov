import type { FeedItem } from '@/types';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useCallback, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { fadeIn } from './animations';

interface BaseContentProps {
  isActive?: boolean;
  readOnly?: boolean;
  hasReachedLimit?: boolean;
}

interface DebateContentProps extends BaseContentProps {
  debate: FeedItem;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
}

export function DebateContent({ 
  debate, 
  onVote, 
  readOnly = false,
  hasReachedLimit = false,
  className
}: DebateContentProps & { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(null);
  const [votedQuestions, setVotedQuestions] = useState<Set<number>>(new Set());
  
  const findNextQuestion = useCallback((currentNum: number | null) => {
    const questions = Array.from({ length: 3 }, (_, i) => i + 1)
      .filter(i => debate[`ai_question_${i}` as keyof FeedItem]);

    if (currentNum === null) {
      return questions.find(i => !votedQuestions.has(i)) ?? null;
    }

    const currentIndex = questions.indexOf(currentNum);
    if (currentIndex === -1) return null;

    for (let i = currentIndex + 1; i < questions.length; i++) {
      if (!votedQuestions.has(questions[i])) {
        return questions[i];
      }
    }

    return null;
  }, [debate, votedQuestions]);

  const content = useMemo(() => {
    const summaryPoints = debate.ai_summary
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const questions = Array.from({ length: 3 }, (_, i) => {
      const key = `ai_question_${i + 1}` as keyof FeedItem;
      const question = debate[key] as string | undefined;
      return question ? { number: i + 1, text: question } : null;
    }).filter(Boolean);

    if (currentQuestion === null && questions.length > 0) {
      const firstQuestion = questions.find(q => !votedQuestions.has(q!.number));
      if (firstQuestion) {
        setCurrentQuestion(firstQuestion.number);
      }
    }
    const breakPattern = Math.floor(Math.random() * 4);
    
    const formattedSummary = summaryPoints.map((point, idx) => {
      const isFirst = idx === 0;
      const isSecond = idx === 1;
      const shouldBreak = 
        (breakPattern === 1 && isFirst) || 
        (breakPattern === 2 && isSecond) || 
        (breakPattern === 3 && (isFirst || isSecond));
      
      return point + (shouldBreak ? '\n\n' : ' ');
    }).join('');

    return {
      fullText: formattedSummary,
      firstPoint: summaryPoints[0],
      hasMore: summaryPoints.length > 1,
      questions
    };
  }, [debate, currentQuestion, votedQuestions]);

  const handleVote = useCallback(async (questionNum: number, vote: boolean) => {
    try {
      await onVote?.(debate.id, questionNum, vote);
      setVotedQuestions(prev => new Set(prev).add(questionNum));
      
      setTimeout(() => {
        const nextQuestion = findNextQuestion(questionNum);
        setCurrentQuestion(nextQuestion);
      }, 500);
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  }, [debate.id, onVote, findNextQuestion]);

  const handleSkip = useCallback((questionNum: number) => {
    setVotedQuestions(prev => new Set(prev).add(questionNum));
    const nextQuestion = findNextQuestion(questionNum);
    setCurrentQuestion(nextQuestion);
  }, [findNextQuestion]);

  return (
    <CardContent className={cn("relative", className)}>
      <motion.div className="relative" {...fadeIn}>
        <div className="prose max-w-none mb-4">
          <p className={cn(
            "text-muted-foreground leading-relaxed m-0",
            "text-justify whitespace-pre-line"
          )}>
            {isExpanded 
              ? content.fullText
              : content.firstPoint}
            {!isExpanded && content.hasMore && (
              <button
                onClick={() => setIsExpanded(true)}
                className="ml-1 text-primary hover:text-primary/80 text-sm font-medium"
              >
                Read more
              </button>
            )}
          </p>
        </div>

        {content.questions.map((item) => (
          item && item.number === currentQuestion && (
            <Question
              key={item.number}
              number={item.number}
              question={item.text}
              onVote={handleVote}
              onSkip={handleSkip}
              readOnly={readOnly}
              hasReachedLimit={hasReachedLimit}
              totalQuestions={content.questions.length}
            />
          )
        ))}
      </motion.div>

      {hasReachedLimit && (
        <motion.div 
          className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-background/80 backdrop-blur-sm"
          {...fadeIn}
        >
          <span className="text-yellow-600 text-xs">
            Daily voting limit reached
          </span>
        </motion.div>
      )}
    </CardContent>
  );
}

function Question({ 
  number,
  question,
  onVote,
  onSkip,
  readOnly,
  hasReachedLimit
}: {
  number: number;
  question: string;
  onVote: (num: number, vote: boolean) => void;
  onSkip: (num: number) => void;
  readOnly: boolean;
  hasReachedLimit: boolean;
  totalQuestions: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border bg-muted/50 shadow-sm relative"
    >
      <div className="p-3">
        {!readOnly && !hasReachedLimit && (
          <button
            onClick={() => onSkip(number)}
            className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
        <p className="text-base leading-relaxed pr-12 m-0">
          {question}
        </p>
        
        {!readOnly && !hasReachedLimit && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2"
          >
            <VoteButtons 
              onVote={onVote}
              questionNumber={number} 
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export function VoteButtons({ onVote, questionNumber }: { 
  onVote: (num: number, vote: boolean) => void;
  questionNumber: number;
}) {
  const buttonClasses = "w-full relative overflow-hidden group h-7 text-xs";
  
  return (
    <div className="flex gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className={cn(buttonClasses, "hover:bg-emerald-500/10")}
        onClick={() => onVote(questionNumber, true)}
      >
        <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
        Aye
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn(buttonClasses, "hover:bg-rose-500/10")}
        onClick={() => onVote(questionNumber, false)}
      >
        <XCircle className="mr-1 h-3 w-3 text-rose-500" />
        Noe
      </Button>
    </div>
  );
} 