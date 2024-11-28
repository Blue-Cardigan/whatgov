import { FeedItem } from '@/types';
import { PostCard } from '@/components/posts/PostCard';
import { DebateSkeleton } from './DebateSkeleton';
import { useVirtualizedFeed } from '@/hooks/useFeed';

interface DebateListProps {
  items: FeedItem[];
  isLoading: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isFetchingNextPage: boolean;
  onVote?: (debateId: string, vote: boolean) => void;
  readOnly?: boolean;
  hasMore?: boolean;
  userMp?: string | null;
  isEngagedCitizen?: boolean;
}

export function DebateList({ items, isLoading, loadMoreRef, userMp, isEngagedCitizen, ...props }: DebateListProps) {
  const { virtualizer, parentRef, updateItemState } = useVirtualizedFeed(items);
  
  if (isLoading) {
    return <DebateSkeleton />;
  }

  const filteredItems = items.filter(item => item.ai_summary);

  if (filteredItems.length === 0) {
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
          const item = filteredItems[virtualRow.index];
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
                userMp={userMp}
                isEngagedCitizen={isEngagedCitizen}
                {...props}
                onVote={props.onVote}
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