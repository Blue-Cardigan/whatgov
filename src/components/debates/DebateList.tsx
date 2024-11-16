import { FeedItem } from '@/types';
import { DebateCard } from './DebateCard';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useCallback, useEffect } from 'react';
import { DebateSkeleton } from './DebateSkeleton';
import { useEngagement } from '@/hooks/useEngagement';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FREE_LIMITS } from '@/lib/utils';

interface DebateListProps {
  items: FeedItem[];
  isLoading: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
}

export function DebateList({ 
  items, 
  isLoading, 
  loadMoreRef, 
  isFetchingNextPage,
  onVote,
  readOnly = false
}: DebateListProps) {
  const { submitVote, hasVoted } = useVotes();
  const { user } = useAuth();
  const router = useRouter();
  const { 
    recordVote, 
    getRemainingVotes, 
    shouldShowVotePrompt,
    hasReachedVoteLimit 
  } = useEngagement();
  const parentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Track which cards have key points expanded
  const expandedStatesRef = useRef(new Map<string, boolean>());

  // 1. Add memoized measurement cache
  const measurementCache = useRef<{
    compact: Map<string, number>;
    expanded: Map<string, number>;
  }>({
    compact: new Map(),
    expanded: new Map()
  });

  // 2. Improve size estimation logic
  const estimateSize = useCallback((index: number) => {
    const item = items[index];
    const isExpanded = expandedStatesRef.current.get(item.id);
    
    // Return cached measurement based on expansion state
    if (isExpanded && measurementCache.current.expanded.has(item.id)) {
      return measurementCache.current.expanded.get(item.id)!;
    } else if (!isExpanded && measurementCache.current.compact.has(item.id)) {
      return measurementCache.current.compact.get(item.id)!;
    }

    // Estimate based on content
    const baseHeight = 250; // Base card height
    const questionsHeight = (item.ai_question_1 ? 150 : 0) + 
                          (item.ai_question_2 ? 150 : 0) + 
                          (item.ai_question_3 ? 150 : 0);
    
    return isExpanded ? baseHeight + questionsHeight + 300 : baseHeight + questionsHeight;
  }, [items]);

  // 4. Optimized virtualizer configuration
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 3,
    paddingStart: 0,
    paddingEnd: 0,
    scrollMargin: 0,
    measureElement: useCallback((element: HTMLElement) => {
      const height = element.getBoundingClientRect().height;
      const debateId = element.getAttribute('data-debate-id');
      const isExpanded = debateId ? expandedStatesRef.current.get(debateId) : false;
      
      if (debateId) {
        if (isExpanded) {
          measurementCache.current.expanded.set(debateId, height);
        } else {
          measurementCache.current.compact.set(debateId, height);
        }
      }
      
      return height;
    }, [])
  });

  // 3. Improved ResizeObserver setup
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      let needsRemeasure = false;

      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        const index = Number(element.getAttribute('data-index'));
        const debateId = element.getAttribute('data-debate-id');
        
        if (!isNaN(index) && debateId && items[index]) {
          const height = entry.borderBoxSize[0]?.blockSize || entry.contentRect.height;
          const isExpanded = expandedStatesRef.current.get(debateId);
          
          // Store in appropriate cache
          if (isExpanded) {
            if (measurementCache.current.expanded.get(debateId) !== height) {
              measurementCache.current.expanded.set(debateId, height);
              needsRemeasure = true;
            }
          } else {
            if (measurementCache.current.compact.get(debateId) !== height) {
              measurementCache.current.compact.set(debateId, height);
              needsRemeasure = true;
            }
          }
        }
      });

      if (needsRemeasure) {
        virtualizer.measure();
      }
    });

    resizeObserverRef.current = observer;
    return () => observer.disconnect();
  }, [items, virtualizer]);

  // Handle expanded state changes
  const handleExpandChange = useCallback((debateId: string, isExpanded: boolean) => {
    expandedStatesRef.current.set(debateId, isExpanded);
    // Force a re-measure after animation completes
    setTimeout(() => {
      virtualizer.measure();
    }, 300); // Match your animation duration
  }, [virtualizer]);

  const handleVote = useCallback(async (
    debateId: string, 
    questionNumber: number, 
    vote: boolean
  ) => {
    // Check if already voted
    if (hasVoted(debateId, questionNumber)) {
      toast({
        title: "Already voted",
        description: "You've already voted on this question",
        variant: "default",
      });
      return;
    }

    // Check vote limits for anonymous users
    if (!user && hasReachedVoteLimit()) {
      toast({
        title: "Daily vote limit reached",
        description: "Create a free account to get more daily votes",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => router.push('/accounts/signup')}
          >
            Create an account to continue voting
          </Button>
        ),
      });
      return;
    }

    try {
      // Record anonymous vote in engagement tracking
      if (!user) {
        recordVote();
      }
      
      // Handle vote submission
      if (onVote) {
        onVote(debateId, questionNumber, vote);
      } else {
        await submitVote({ debate_id: debateId, question_number: questionNumber, vote });
      }

      // Show success toast for anonymous users to encourage signup
      if (!user) {
        toast({
          title: "Vote recorded",
          description: `${getRemainingVotes()} votes remaining today. Sign up for more!`,
          action: (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => router.push('/accounts/signup')}
            >
              Sign up
            </Button>
          ),
        });
      }
    } catch (error) {
      console.error('Failed to submit vote:', error);
      toast({
        title: "Error",
        description: "Failed to submit your vote. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    hasVoted,
    user,
    hasReachedVoteLimit,
    recordVote,
    onVote,
    submitVote,
    getRemainingVotes,
    router
  ]);

  // Show engagement prompt toast when appropriate
  useEffect(() => {
    if (shouldShowVotePrompt()) {
      toast({
        title: `${getRemainingVotes()}/${FREE_LIMITS.DAILY_VOTES} votes remaining today`,
        description: "Create a free account to get unlimited daily votes, and track your engagement over time.",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => router.push('/accounts/signup')}
          >
            Create an account
          </Button>
        ),
        duration: 10000, // 10 seconds
      });
    }
  }, [shouldShowVotePrompt, getRemainingVotes, router]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No debates found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 3 }).map((_, i) => (
          <DebateSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="w-full space-y-4">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const debate = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              data-debate-id={debate.id}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DebateCard
                debate={debate}
                onVote={handleVote}
                readOnly={readOnly}
                onExpandChange={(isExpanded) => handleExpandChange(debate.id, isExpanded)}
                isExpanded={expandedStatesRef.current.get(debate.id)}
                hasReachedLimit={hasReachedVoteLimit()}
              />
            </div>
          );
        })}
      </div>
      
      <div ref={loadMoreRef} className="h-4">
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
} 