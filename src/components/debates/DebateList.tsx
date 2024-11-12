import { FeedItem } from '@/types';
import { DebateCard } from './DebateCard';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';

interface DebateListProps {
  items: FeedItem[];
  isLoading: boolean;
  loadMoreRef?: React.RefObject<HTMLDivElement>;
  isFetchingNextPage?: boolean;
}

export function DebateList({ 
  items, 
  isLoading, 
  loadMoreRef, 
  isFetchingNextPage 
}: DebateListProps) {
  const { votes, submitVote } = useVotes();
  const { user } = useAuth();

  const handleVote = async (debateId: string, questionNumber: number, vote: boolean) => {
    if (!user) return;
    try {
      await submitVote({ debateId, questionNumber, vote });
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((debate: FeedItem) => (
        <DebateCard
          key={debate.ext_id}
          debate={debate}
          onVote={handleVote}
          votes={votes}
        />
      ))}
      
      {loadMoreRef && (
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          )}
        </div>
      )}
    </div>
  );
} 