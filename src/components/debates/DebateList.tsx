import { FeedItem } from '@/types';
import { PostCard } from '@/components/posts/PostCard';
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
import dynamic from 'next/dynamic'
import { useToast } from "@/hooks/use-toast";

interface DebateListProps {
  items: FeedItem[];
  isLoading: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
  hasMore?: boolean;
}

// Add these type definitions
interface VirtualItem {
  key: number;
  index: number;
  start: number;
}

interface VirtualizedDebateListProps {
  items: FeedItem[];
  virtualizer: {
    getTotalSize: () => number;
    getVirtualItems: () => VirtualItem[];
    measureElement: (element: HTMLElement) => void;
    measure: () => void;
  };
  expandedStatesRef: React.MutableRefObject<Map<string, boolean>>;
  handleVote: (debateId: string, questionNumber: number, vote: boolean) => void;
  profile: { mp?: string } | null;
  readOnly: boolean;
  hasReachedVoteLimit: () => boolean;
  estimateSize: (index: number) => number;
}

// Create a client-only version of the virtualized list
const VirtualizedDebateList = dynamic(() => Promise.resolve(({ 
  items, 
  virtualizer, 
  expandedStatesRef, 
  handleVote, 
  profile, 
  readOnly, 
  hasReachedVoteLimit,
  estimateSize
}: VirtualizedDebateListProps) => (
  <div
    style={{
      height: `${virtualizer.getTotalSize()}px`,
      width: '100%',
      position: 'relative',
    }}
  >
    {virtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
      const item = items[virtualRow.index];
      return (
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          data-debate-id={item.id}
          ref={virtualizer.measureElement as React.LegacyRef<HTMLDivElement>}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
            minHeight: estimateSize(virtualRow.index),
          }}
        >
          <PostCard
            item={item}
            userMp={profile?.mp}
            onVote={handleVote}
            readOnly={readOnly}
            onExpandChange={(isExpanded) => {
              expandedStatesRef.current.set(item.id, isExpanded);
              setTimeout(() => virtualizer.measure(), 300);
            }}
            hasReachedLimit={hasReachedVoteLimit()}
          />
        </div>
      );
    })}
  </div>
)), { ssr: false })

export function DebateList({ 
  items, 
  isLoading, 
  loadMoreRef, 
  isFetchingNextPage,
  onVote,
  readOnly = false,
  hasMore = true
}: DebateListProps) {
  const { submitVote, hasVoted } = useVotes();
  const { user, profile } = useAuth();
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

  // Measurement cache for virtualization
  const measurementCache = useRef<{
    compact: Map<string, number>;
    expanded: Map<string, number>;
  }>({
    compact: new Map(),
    expanded: new Map()
  });

  // Size estimation for virtualization
  const estimateSize = useCallback((index: number) => {
    const item = items[index];
    const isExpanded = expandedStatesRef.current.get(item.id);
    
    if (isExpanded && measurementCache.current.expanded.has(item.id)) {
      return measurementCache.current.expanded.get(item.id)!;
    } else if (!isExpanded && measurementCache.current.compact.has(item.id)) {
      return measurementCache.current.compact.get(item.id)!;
    }

    // More conservative base estimation
    const baseHeight = 150; // Reduced from 300
    const questionsHeight = (item.ai_question_1 ? 100 : 0) + 
                          (item.ai_question_2 ? 100 : 0) + 
                          (item.ai_question_3 ? 100 : 0);
    
    // Add extra height for divisions if present
    const divisionsHeight = item.divisions?.length ? 200 : 0; // Reduced from 400
    
    return isExpanded 
      ? baseHeight + questionsHeight + divisionsHeight + 150 // Reduced extra padding
      : baseHeight + questionsHeight + divisionsHeight;
  }, [items]);

  // Virtualizer configuration
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
    if (typeof window === 'undefined') return;

    // Setup ResizeObserver
    const observer = new ResizeObserver((entries) => {
      let needsRemeasure = false;

      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        const index = Number(element.getAttribute('data-index'));
        const debateId = element.getAttribute('data-debate-id');
        
        if (!isNaN(index) && debateId && items[index]) {
          const height = entry.borderBoxSize[0]?.blockSize || entry.contentRect.height;
          const isExpanded = expandedStatesRef.current.get(debateId);
          
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

  // Get both toast and dismiss from useToast hook
  const { toast, dismiss } = useToast();
  
  const handleSignUpClick = useCallback(() => {
    dismiss(); // Dismiss all toasts
    router.push('/signup');
  }, [router, dismiss]);

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

    // Only check vote limits for unauthenticated users
    if (!user && hasReachedVoteLimit()) {
      toast({
        title: "Daily vote limit reached",
        description: "Create a free account to get more daily votes",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSignUpClick}
          >
            Create an account to continue voting
          </Button>
        ),
      });
      return;
    }

    try {
      // Only record votes for unauthenticated users
      if (!user) {
        recordVote();
      }
      
      if (onVote) {
        onVote(debateId, questionNumber, vote);
      } else {
        await submitVote({ debate_id: debateId, question_number: questionNumber, vote });
      }

      // Only show remaining votes toast for unauthenticated users
      if (!user && !shouldShowVotePrompt()) {
        toast({
          title: "Vote recorded",
          description: `${getRemainingVotes()-1}/${FREE_LIMITS.DAILY_VOTES} votes remaining today. Create an account for unlimited daily votes!`,
          action: (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSignUpClick}
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
    shouldShowVotePrompt,
    handleSignUpClick,
    toast
  ]);

  // Only show engagement prompt for unauthenticated users
  useEffect(() => {
    if (!user && shouldShowVotePrompt()) {
      toast({
        title: `${getRemainingVotes()}/${FREE_LIMITS.DAILY_VOTES} votes remaining today`,
        description: "Create a free account to get unlimited daily votes, and track your engagement over time.",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSignUpClick}
          >
            Create an account
          </Button>
        ),
      });
    }
  }, [shouldShowVotePrompt, getRemainingVotes, router, user, handleSignUpClick, toast]);

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
    <div ref={parentRef} className="w-full">
      {typeof window !== 'undefined' && (
        <VirtualizedDebateList
          items={items}
          virtualizer={{
            getTotalSize: virtualizer.getTotalSize,
            getVirtualItems: virtualizer.getVirtualItems as () => VirtualItem[],
            measureElement: virtualizer.measureElement,
            measure: virtualizer.measure
          }}
          expandedStatesRef={expandedStatesRef}
          handleVote={handleVote}
          profile={profile}
          readOnly={readOnly}
          hasReachedVoteLimit={hasReachedVoteLimit}
          estimateSize={estimateSize}
        />
      )}
      
      <div ref={loadMoreRef} className="h-4">
        {isFetchingNextPage && (
          <div className="space-y-px">
            <DebateSkeleton />
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No more debates to show
          </div>
        )}
      </div>
    </div>
  );
} 