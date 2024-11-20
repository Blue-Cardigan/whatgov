import { useState } from 'react';
import { TopicVotes } from '@/types/VoteStats';
import { VotingChart } from './VotingChart';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface VotingTrendsChartProps {
  userTopicVotes: TopicVotes;
}

export function VotingTrendsChart({ userTopicVotes }: VotingTrendsChartProps) {
  const [timeframe, setTimeframe] = useState<'all' | 'year' | 'month' | 'week'>('all');

  // Process all votes into time series data
  const processVoteHistory = () => {
    // Combine all votes from all topics
    const allVotes = Object.values(userTopicVotes)
      .flatMap(topic => topic.vote_history || [])
      .filter(vote => vote?.created_at); // Filter out any null votes

    // Sort votes by date
    const sortedVotes = [...allVotes].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Filter based on timeframe
    const now = new Date();
    const timeframeFilter = (date: Date) => {
      switch (timeframe) {
        case 'week':
          return now.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return now.getTime() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
        case 'year':
          return now.getTime() - date.getTime() <= 365 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    };

    const filteredVotes = sortedVotes
      .filter(vote => timeframeFilter(new Date(vote.created_at)));

    // Create cumulative data points
    let ayeCount = 0;
    let noeCount = 0;
    
    return filteredVotes.map(vote => {
      if (vote.vote) ayeCount++; else noeCount++;
      return {
        timestamp: vote.created_at,
        Ayes: ayeCount,
        Noes: noeCount
      };
    });
  };

  const chartData = processVoteHistory();

  // Calculate totals
  const totals = Object.values(userTopicVotes).reduce(
    (acc, topic) => ({
      ayes: acc.ayes + (topic.aye_votes || 0),
      noes: acc.noes + (topic.no_votes || 0)
    }),
    { ayes: 0, noes: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Time Controls */}
      <div className="flex items-center justify-between">
        <Tabs 
          value={timeframe} 
          onValueChange={(value: string) => setTimeframe(value as 'all' | 'year' | 'month' | 'week')}
        >
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vote Totals */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">
              {totals.ayes}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Aye Votes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-rose-600">
              {totals.noes}
            </div>
            <div className="text-sm text-muted-foreground">
              Total No Votes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <VotingChart 
          data={chartData}
          timeframe={timeframe}
        />
      ) : (
        <div className="h-[300px] flex items-center justify-center border border-dashed rounded-lg">
          <div className="text-center text-muted-foreground">
            No voting data available for this timeframe
          </div>
        </div>
      )}
    </div>
  );
} 