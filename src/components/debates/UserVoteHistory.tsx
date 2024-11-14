'use client';

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Tags,
  TrendingUp,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from '@/lib/supabase-client';

interface VotingStats {
  totalVotes: number;
  ayeVotes: number;
  noVotes: number;
  topicStats: Map<string, {
    total: number;
    ayes: number;
    noes: number;
  }>;
  weeklyStats: {
    week: string;
    ayes: number;
    noes: number;
  }[];
}

interface VoteHistoryEntry {
  vote: boolean;
  created_at: string;
  debates: {
    ai_topics: Record<string, any>;
  } | null;
}

export function UserVoteHistory() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  
  // Fetch user profile for selected topics
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('user_profiles')
        .select('selected_topics')
        .eq('id', user?.id || '')
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch voting history
  const { data: votingHistory } = useQuery({
    queryKey: ['votingHistory', user?.id, selectedTimeframe],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('debate_votes')
        .select(`
          vote,
          created_at,
          debates!inner (
            ai_topics
          )
        `)
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as any[]).map(entry => ({
        vote: entry.vote,
        created_at: entry.created_at,
        debates: entry.debates || null
      })) as VoteHistoryEntry[];
    },
    enabled: !!user,
  });

  // Calculate statistics
  const stats: VotingStats | undefined = votingHistory ? {
    totalVotes: votingHistory.length,
    ayeVotes: votingHistory.filter(v => v.vote).length,
    noVotes: votingHistory.filter(v => !v.vote).length,
    topicStats: calculateTopicStats(votingHistory, userProfile?.selected_topics || []),
    weeklyStats: calculateWeeklyStats(votingHistory),
  } : undefined;

  if (!user) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Please sign in to view your voting history
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Votes"
          value={stats?.totalVotes || 0}
          icon={<Activity className="h-4 w-4" />}
          description="All-time votes cast"
        />
        <StatCard
          title="Aye Votes"
          value={stats?.ayeVotes || 0}
          icon={<ThumbsUp className="h-4 w-4" />}
          description="Times voted in favor"
          className="text-emerald-600"
        />
        <StatCard
          title="No Votes"
          value={stats?.noVotes || 0}
          icon={<ThumbsDown className="h-4 w-4" />}
          description="Times voted against"
          className="text-rose-600"
        />
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">
            <Tags className="h-4 w-4 mr-2" />
            By Topic
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Voting by Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {Array.from(stats?.topicStats || []).map(([topic, stats]) => (
                    <TopicStatCard
                      key={topic}
                      topic={topic}
                      stats={stats}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">
                Voting Trends
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedTimeframe === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe('week')}
                >
                  Week
                </Button>
                <Button
                  variant={selectedTimeframe === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe('month')}
                >
                  Month
                </Button>
                <Button
                  variant={selectedTimeframe === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe('year')}
                >
                  Year
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <VotingTrends />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function StatCard({ title, value, icon, description, className }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-primary/5 ${className}`}>
            {icon}
          </div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className="mt-4">
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">
            {description}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopicStatCard({ topic, stats }: {
  topic: string;
  stats: { total: number; ayes: number; noes: number; };
}) {
  const ayePercentage = (stats.ayes / stats.total) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">{topic}</div>
        <div className="text-sm text-muted-foreground">
          {stats.total} votes
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={ayePercentage} className="h-2" />
        <span className="text-sm text-muted-foreground w-12">
          {Math.round(ayePercentage)}%
        </span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{stats.ayes} Ayes</span>
        <span>{stats.noes} Noes</span>
      </div>
    </div>
  );
}

function VotingTrends() {
  return (
    <div className="h-[300px]">
      <div className="text-center text-muted-foreground">
        Chart implementation coming soon...
      </div>
    </div>
  );
}

// Helper functions for statistics calculations
function calculateTopicStats(
  votingHistory: VoteHistoryEntry[],
  selectedTopics: string[]
): Map<string, { total: number; ayes: number; noes: number; }> {
  const stats = new Map();
  
  selectedTopics.forEach(topic => {
    stats.set(topic, { total: 0, ayes: 0, noes: 0 });
  });

  votingHistory.forEach(vote => {
    const topics = vote.debates?.ai_topics || [];
    topics.forEach((topic: string) => {
      if (stats.has(topic)) {
        const topicStats = stats.get(topic);
        topicStats.total++;
        if (vote.vote) topicStats.ayes++;
        else topicStats.noes++;
      }
    });
  });

  return stats;
}

function calculateWeeklyStats(votingHistory: VoteHistoryEntry[]): VotingStats['weeklyStats'] {
  // Group votes by week and calculate totals
  const weeklyStats = new Map<string, { ayes: number; noes: number; }>();
  
  votingHistory.forEach(vote => {
    const week = format(new Date(vote.created_at), 'yyyy-ww');
    if (!weeklyStats.has(week)) {
      weeklyStats.set(week, { ayes: 0, noes: 0 });
    }
    const stats = weeklyStats.get(week)!;
    if (vote.vote) stats.ayes++;
    else stats.noes++;
  });

  return Array.from(weeklyStats.entries())
    .map(([week, stats]) => ({
      week,
      ...stats
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}