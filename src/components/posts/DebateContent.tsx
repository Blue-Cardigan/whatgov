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
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const { hasVoted } = useVotes();
  
  const isVoted = localVoted || hasVoted(debate.id);
  
  const handleVote = useCallback(async (vote: boolean) => {
    if (!onVote) return;
    
    setIsVoting(true);
    setVoteError(null);
    
    try {
      await onVote(debate.id, vote);
      setLocalVoted(true);
    } catch (error) {
      setVoteError('Failed to submit vote. Please try again.');
      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  }, [debate.id, onVote]);

  const content = useMemo(() => {
    if (!debate.ai_summary) {
      return {
        fullText: '',
        truncatedText: '',
        hasMore: false,
      };
    }

    const summaryPoints = debate.ai_summary
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    const firstPoint = summaryPoints[0] || '';
    const truncatedFirst = firstPoint.length > 140 
      ? firstPoint.slice(0, 140).trim() + '...'
      : firstPoint;

    const formattedSummary = summaryPoints
      .join('\n\n')
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
        <div className="text-sm text-muted-foreground leading-relaxed text-justify">
          {(isExpanded ? content.fullText : content.truncatedText)
            .split('\n\n')
            .map((paragraph, index) => (
              <p key={index} className="mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <p className="text-sm font-medium flex-1">{debate.ai_question}</p>
            {!readOnly && !hasReachedLimit && (
              <div className="shrink-0 sm:min-w-[120px]">
                <VoteButtons 
                  onVote={handleVote} 
                  isVoting={isVoting}
                />
              </div>
            )}
          </div>
          {voteError && (
            <span className="text-destructive text-xs mt-2 block">
              {voteError}
            </span>
          )}
          {hasReachedLimit && (
            <span className="text-yellow-600 text-xs mt-2 block">
              Daily voting limit reached
            </span>
          )}
        </div>
      )}

      {/* Show success message when vote is recorded */}
      {isVoted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 border-t pt-4"
        >
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            You Voted.
          </p>
        </motion.div>
      )}
    </CardContent>
  );
}

interface VoteButtonsProps {
  onVote: (vote: boolean) => void;
  isVoting?: boolean;
}

export function VoteButtons({ onVote, isVoting }: VoteButtonsProps) {
  const buttonClasses = "w-full relative overflow-hidden group h-7 text-xs";
  
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className={cn(buttonClasses, "hover:bg-emerald-500/10")}
        onClick={() => onVote(true)}
        disabled={isVoting}
      >
        <CheckCircle2 className={cn(
          "mr-1 h-3 w-3 text-emerald-500",
          isVoting && "animate-spin"
        )} />
        Aye
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn(buttonClasses, "hover:bg-rose-500/10")}
        onClick={() => onVote(false)}
        disabled={isVoting}
      >
        <XCircle className={cn(
          "mr-1 h-3 w-3 text-rose-500",
          isVoting && "animate-spin"
        )} />
        Noe
      </Button>
    </div>
  );
} 