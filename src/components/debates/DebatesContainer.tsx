'use client';

import { useState } from 'react';
import { DebateFeed } from './DebateFeed';
import { YourVotes } from './YourVotes';
import { useSwipeable } from 'react-swipeable';
import { Button } from '@/components/ui/button';
import { useVotes } from '@/hooks/useVotes';

export function DebatesContainer() {
  const [activeTab, setActiveTab] = useState<'feed' | 'votes'>('feed');
  const { votes } = useVotes();

  const handlers = useSwipeable({
    onSwipedLeft: () => setActiveTab('votes'),
    onSwipedRight: () => setActiveTab('feed'),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  return (
    <div className="container py-6">
      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === 'feed' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('feed')}
        >
          Feed
          {votes.size === 0 && <span className="ml-2 text-xs">New</span>}
        </Button>
        <Button
          variant={activeTab === 'votes' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('votes')}
        >
          Your Votes
          {votes.size > 0 && <span className="ml-2 text-xs">({votes.size})</span>}
        </Button>
      </div>

      <div {...handlers} className="touch-pan-y">
        {activeTab === 'feed' ? <DebateFeed /> : <YourVotes />}
      </div>
    </div>
  );
} 