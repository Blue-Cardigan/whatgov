import type { FeedItem } from '@/types';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, LightbulbIcon, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useCallback, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { fadeIn } from './animations';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";

interface BaseContentProps {
  isActive?: boolean;
  readOnly?: boolean;
  hasReachedLimit?: boolean;
}

interface DebateContentProps extends BaseContentProps {
  debate: FeedItem;
  onVote?: (debateId: string, vote: boolean) => void;
  showFullAnalysis?: boolean;
  hideQuestion?: boolean;
  hideReadMore?: boolean;
  hideAnalysis?: boolean;
}

interface AnalysisPreviewProps {
  onUpgrade: () => void;
  variant?: 'subtle' | 'full';
}

export function AnalysisPreview({ onUpgrade, variant = 'full' }: AnalysisPreviewProps) {
  const isSubtle = variant === 'subtle';

  return (
    <div className={`relative rounded-lg border bg-muted/5 overflow-hidden ${isSubtle ? 'p-4' : 'min-h-[200px]'}`}>
      {isSubtle ? (
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <LightbulbIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-1">
              Full Analysis Available
            </h4>
            <p className="text-xs text-muted-foreground">
              Upgrade to see detailed insights and expert analysis
            </p>
          </div>
          <Button size="sm" onClick={onUpgrade} className="shrink-0">
            Upgrade
          </Button>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <LightbulbIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onUpgrade} className="gap-2">
              Unlock Full Analysis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DebateContent({ 
  debate, 
  className,
  readOnly,
  hasReachedLimit,
  onVote,
  showFullAnalysis = false,
  hideQuestion = false,
  hideReadMore = false,
  analysisPreviewVariant = 'full',
  hideAnalysis = false
}: DebateContentProps & { 
  className?: string;
  analysisPreviewVariant?: 'subtle' | 'full';
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localVoted, setLocalVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { hasVoted } = useVotes();
  const { user, isEngagedCitizen } = useAuth();
  
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
    const overview = debate.ai_overview || '';
    const summary = debate.ai_summary || '';
  
    if (!overview && !summary) {
      return {
        overview,
        truncatedOverview: '',
        hasMoreOverview: false,
        fullSummary: summary,
        hasDifferentSummary: false,
      };
    }
  
    const truncatedOverview = overview.length > 280 
      ? overview.slice(0, 280).trim() + '...'
      : overview;
  
    // Only consider it different if summary exists and is different from overview
    const hasDifferentSummary = summary.length > 0 && summary.trim() !== overview.trim();
  
    return {
      overview,
      truncatedOverview,
      hasMoreOverview: overview.length > 280,
      fullSummary: summary,
      hasDifferentSummary,
    };
  }, [debate.ai_overview, debate.ai_summary]);

  const handleUpgradePrompt = () => {
    setShowUpgradeDialog(true);
  };

  return (
    <CardContent className={cn("relative space-y-4", className)}>
      <motion.div className="relative" {...fadeIn}>
        {showFullAnalysis ? (
          <div className="text-sm text-muted-foreground leading-relaxed text-justify">
            <p>{content.fullSummary}</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground leading-relaxed text-justify">
              <p>{hideReadMore ? content.overview : (isExpanded ? content.overview : content.truncatedOverview)}</p>
            </div>
            
            {!hideReadMore && content.hasMoreOverview && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-1 text-primary hover:text-primary/80 text-sm font-medium"
              >
                {isExpanded ? 'Read less' : 'Read more'}
              </button>
            )}

            {content.hasDifferentSummary && !isEngagedCitizen && !hideReadMore && (
              <div className="mt-4 border-t pt-4">
                <AnalysisPreview 
                  onUpgrade={handleUpgradePrompt} 
                  variant={analysisPreviewVariant}
                />
              </div>
            )}
          </>
        )}
      </motion.div>

      {!hideQuestion && !showFullAnalysis && !isVoted && debate.ai_question && (
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

      {!showFullAnalysis && isVoted && (
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

      {!hideAnalysis && content.hasDifferentSummary && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Analysis</h3>
            </div>
          </div>
          
          {isEngagedCitizen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted-foreground leading-relaxed text-justify"
            >
              <p>{content.fullSummary}</p>
            </motion.div>
          )}
        </div>
      )}

      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        title="Unlock Full Analysis"
        description="Get instant access to complete debate analyses with an Engaged Citizen subscription."
      />
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