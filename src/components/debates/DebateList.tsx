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
import { useVirtualizedFeed } from '@/hooks/useFeed';

interface DebateListProps {
  items: FeedItem[];
  isLoading: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
  hasMore?: boolean;
}

export function DebateList({ items, isLoading, loadMoreRef, ...props }: DebateListProps) {
  const { virtualizer, parentRef, updateItemState } = useVirtualizedFeed(items);
  
  if (isLoading) {
    return <DebateSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No debates found
      </div>
    );
  }

  return (
    <div ref={parentRef} className="w-full">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              data-debate-id={item.id}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <PostCard
                item={item}
                {...props}
                onExpandChange={(isExpanded) => {
                  updateItemState(item.id, isExpanded);
                }}
              />
            </div>
          );
        })}
      </div>
      <div ref={loadMoreRef} />
    </div>
  );
} 