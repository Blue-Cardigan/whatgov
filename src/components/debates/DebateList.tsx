import { FeedItem } from '@/types';
import { DebateCard } from './DebateCard';
import { useVotes } from '@/hooks/useVotes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

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
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on debates",
        variant: "destructive",
      });
      return;
    }
    
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