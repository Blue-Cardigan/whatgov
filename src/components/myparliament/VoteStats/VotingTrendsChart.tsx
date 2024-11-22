import { useState, useMemo } from 'react';
import type { TopicStatsEntry } from "@/types/VoteStats";
import { VotingChart } from './subcomponents/VotingChart';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { analyzeTrends } from './utils/analyzeTrends';
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";
 {}
interface VotingTrendsChartProps {
  topicVotes: Record<string, TopicStatsEntry>;
  isUserVotes?: boolean;
}

export function VotingTrendsChart({ topicVotes, isUserVotes = false }: VotingTrendsChartProps) {
  const { isEngagedCitizen } = useAuth();
  const [timeframe, setTimeframe] = useState<'all' | 'year' | 'month' | 'week'>('all');

  // Calculate totals from the data
  const totals = useMemo(() => {
    return Object.values(topicVotes).reduce(
      (acc, topic) => ({
        ayes: acc.ayes + (topic.aye_votes || 0),
        noes: acc.noes + (topic.no_votes || 0)
      }),
      { ayes: 0, noes: 0 }
    );
  }, [topicVotes]);

  // Process all votes into time series data
  const processVoteHistory = () => {
    // Combine all votes from all topics
    const allVotes = Object.values(topicVotes)
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

  // Basic users only see total votes
  if (!isEngagedCitizen) {
    return (
      <div className="space-y-6">
        {/* Basic Vote Totals */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">
                {totals.ayes.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Aye Votes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-rose-600">
                {totals.noes.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total No Votes</div>
            </CardContent>
          </Card>
        </div>

        <SubscriptionCTA
          title="Upgrade to see voting trends"
          description="Get detailed insights into your voting patterns over time."
          features={[
            "Track voting trends over time",
            "Filter by different timeframes",
            "Compare Aye/No vote patterns",
            "Analyze voting frequency"
          ]}
        />
      </div>
    );
  }

  // Full implementation for Engaged Citizens
  const chartData = processVoteHistory();
  const trends = analyzeTrends(chartData, timeframe);

  return (
    <div className="space-y-6">
      {/* Time Controls */}
      <div className="flex items-center justify-between">
        <Tabs 
          value={timeframe} 
          onValueChange={(value: string) => setTimeframe(value as typeof timeframe)}
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
              {totals.ayes.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {isUserVotes ? 'Your Aye Votes' : 'Total Aye Votes'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-rose-600">
              {totals.noes.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {isUserVotes ? 'Your No Votes' : 'Total No Votes'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Display */}
      {trends.length > 0 && (
        <div className="space-y-2">
          {trends.map((trend, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {trend.direction === 'up' && <TrendingUp className="h-4 w-4 text-emerald-600" />}
              {trend.direction === 'down' && <TrendingDown className="h-4 w-4 text-rose-600" />}
              {trend.direction === 'stable' && <Minus className="h-4 w-4" />}
              <span>{trend.description}</span>
            </div>
          ))}
        </div>
      )}

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