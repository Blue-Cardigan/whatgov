import { FeedItem } from '@/types';
import { DebateCard } from './DebateCard';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useCallback, useEffect } from 'react';

interface DebateListProps {
  items: FeedItem[];
  isLoading: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
  votes?: Map<string, Map<number, boolean>>;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
}

export function DebateList({ 
  items, 
  isLoading, 
  loadMoreRef, 
  isFetchingNextPage,
  votes,
  onVote,
  readOnly = false
}: DebateListProps) {
  const { votes: globalVotes, submitVote } = useVotes();
  const { user } = useAuth();
  const parentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Create a Map to store measured heights
  const heightsRef = useRef(new Map<string, number>());
  
  // Track which cards have key points expanded
  const expandedStatesRef = useRef(new Map<string, boolean>());

  // Setup ResizeObserver
  useEffect(() => {
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target;
        const index = Number(element.getAttribute('data-index'));
        if (!isNaN(index) && items[index]) {
          const height = entry.borderBoxSize[0]?.blockSize || entry.contentRect.height;
          heightsRef.current.set(items[index].id, height);
          virtualizer.measure(); // Trigger a re-measure of all visible items
        }
      }
    });

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [items]);

  // Observe new elements as they're virtualized
  const observeElement = useCallback((element: HTMLElement | null) => {
    if (element && resizeObserverRef.current) {
      resizeObserverRef.current.observe(element);
      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.unobserve(element);
        }
      };
    }
  }, []);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => {
      const item = items[index];
      // Return cached height or base estimate
      return heightsRef.current.get(item.id) || 600;
    }, [items]),
    overscan: 5,
    paddingStart: 16, // Account for top padding
    paddingEnd: 16,   // Account for bottom padding
  });

  // Handle expanded state changes
  const handleExpandChange = useCallback((debateId: string, isExpanded: boolean) => {
    expandedStatesRef.current.set(debateId, isExpanded);
    // Force a re-measure after animation completes
    setTimeout(() => {
      virtualizer.measure();
    }, 300); // Match your animation duration
  }, [virtualizer]);

  const handleVote = async (debateId: string, questionNumber: number, vote: boolean) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on debates",
        variant: "destructive",
      });
      return;
    }
    
    if (onVote) {
      onVote(debateId, questionNumber, vote);
    } else {
      try {
        await submitVote({ debateId, questionNumber, vote });
      } catch (error) {
        console.error('Failed to submit vote:', error);
        toast({
          title: "Error",
          description: "Failed to submit your vote. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  if (items.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No debates found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-[800px] overflow-auto"
      style={{
        marginRight: 'calc(-1 * (100vw - 100%))'
      }}
    >
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
              ref={observeElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingLeft: '1rem',
                paddingRight: '1rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
              }}
            >
              <DebateCard
                debate={debate}
                votes={votes || globalVotes}
                onVote={handleVote}
                readOnly={readOnly}
                onExpandChange={(isExpanded) => handleExpandChange(debate.id, isExpanded)}
                isExpanded={expandedStatesRef.current.get(debate.id)}
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