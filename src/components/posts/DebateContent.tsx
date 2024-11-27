import type { FeedItem } from '@/types';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useCallback, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { fadeIn } from './animations';
import { useVotes } from '@/hooks/useVotes';

interface BaseContentProps {
  isActive?: boolean;
  readOnly?: boolean;
  hasReachedLimit?: boolean;
}

interface DebateContentProps extends BaseContentProps {
  debate: FeedItem;
  onVote?: (debateId: string, vote: boolean) => void;
}

export function DebateContent({ 
  debate, 
  className,
  readOnly,
  hasReachedLimit,
  onVote
}: DebateContentProps & { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localVoted, setLocalVoted] = useState(false);
  const { hasVoted } = useVotes();
  
  const isVoted = localVoted || hasVoted(debate.id);
  
  const handleVote = useCallback((vote: boolean) => {
    if (onVote) {
      onVote(debate.id, vote);
      setLocalVoted(true);
    }
  }, [debate.id, onVote]);

  const content = useMemo(() => {
    const summaryPoints = debate.ai_summary
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    const firstPoint = summaryPoints[0];
    const truncatedFirst = firstPoint.length > 140 
      ? firstPoint.slice(0, 140).trim() + '...'
      : firstPoint;

    const formattedSummary = summaryPoints
      .map((point, idx) => point + '\n\n')
      .join('')
      .trim();

    return {
      fullText: formattedSummary,
      truncatedText: truncatedFirst,
      hasMore: summaryPoints.length > 1 || firstPoint.length > 140,
    };
  }, [debate]);

  return (
    <CardContent className={cn("relative space-y-4", className)}>
      <motion.div className="relative" {...fadeIn}>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {isExpanded ? content.fullText : content.truncatedText}
        </div>
        
        {content.hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 text-primary hover:text-primary/80 text-sm font-medium"
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        )}
      </motion.div>

      {/* Question Bar - Only show if not voted */}
      {!isVoted && debate.ai_question && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">{debate.ai_question}</p>
            {!readOnly && !hasReachedLimit && (
              <div className="shrink-0">
                <VoteButtons onVote={handleVote} />
              </div>
            )}
          </div>
          {hasReachedLimit && (
            <span className="text-yellow-600 text-xs mt-2 block">
              Daily voting limit reached
            </span>
          )}
        </div>
      )}
    </CardContent>
  );
}

interface VoteButtonsProps {
  onVote: (vote: boolean) => void;
}

export function VoteButtons({ onVote }: VoteButtonsProps) {
  const buttonClasses = "w-full relative overflow-hidden group h-7 text-xs";
  
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className={cn(buttonClasses, "hover:bg-emerald-500/10")}
        onClick={() => onVote(true)}
      >
        <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
        Aye
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn(buttonClasses, "hover:bg-rose-500/10")}
        onClick={() => onVote(false)}
      >
        <XCircle className="mr-1 h-3 w-3 text-rose-500" />
        Noe
      </Button>
    </div>
  );
} 