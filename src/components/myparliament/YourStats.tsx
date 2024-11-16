'use client';

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tags, TrendingUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserVotingStats } from '@/lib/supabase'
import { TOPICS } from "@/lib/utils";
import type { UserVotingStats, TopicStats, TopicQuestion, TopicDetails } from "@/types/VoteStats";
import dynamic from 'next/dynamic';

// Create a single dynamic chart component
const DynamicChart = dynamic(
  () => import('./VotingChart').then((mod) => mod.VotingChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse bg-muted rounded-lg w-full h-full" />
      </div>
    ),
  }
);

export function UserVoteHistory() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'all'>('weekly');

  // Fetch voting statistics
  const { data: stats } = useQuery<UserVotingStats>({
    queryKey: ['votingStats', user?.id, selectedTimeframe],
    queryFn: () => getUserVotingStats(selectedTimeframe),
    enabled: !!user,
  });

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
      {/* Move timeframe selection to the top level */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Voting History</h2>
        <div className="flex gap-2">
          <Button
            variant={selectedTimeframe === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe('daily')}
          >
            Daily
          </Button>
          <Button
            variant={selectedTimeframe === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe('weekly')}
          >
            Weekly
          </Button>
          <Button
            variant={selectedTimeframe === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe('all')}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="topics">
            <Tags className="h-4 w-4 mr-2" />
            By Topic
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
                  {stats?.topicStats && Object.entries(stats.topicStats).map(([topic, stats]) => (
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
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Voting Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VotingTrends selectedTimeframe={selectedTimeframe} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TopicStatCard({ topic, stats }: {
  topic: string;
  stats: TopicStats;
}) {
  const ayePercentage = (stats.ayes / stats.total) * 100;
  const topicInfo = TOPICS.find(t => t.label === topic);
  const [showQuestions, setShowQuestions] = useState(false);
  
  return (
    <div className="space-y-4">
      {/* Topic Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {topicInfo?.icon && (
              <topicInfo.icon className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="font-medium">{topic}</div>
          </div>
        </div>
        
        {/* Vote Distribution */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Progress value={ayePercentage} className="h-2" />
            <span className="text-sm text-muted-foreground w-12">
              {Math.round(ayePercentage)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">{stats.ayes} Ayes</span>
            <span className="text-rose-600">{stats.noes} Noes</span>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      {stats.details[0] && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuestions(!showQuestions)}
            className="w-full justify-between"
          >
            <span>Key Questions</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showQuestions ? 'rotate-180' : ''}`} />
          </Button>
          
          {showQuestions && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              {[1, 2, 3].map(num => {
                const question = stats.details[0][`question_${num}` as keyof TopicDetails] as TopicQuestion;
                if (!question?.text) return null;
                
                const questionAyePercentage = (question.ayes / (question.ayes + question.noes)) * 100;
                
                return (
                  <div key={num} className="space-y-2">
                    <div className="text-sm font-medium">{question.text}</div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={questionAyePercentage} 
                        className="h-2"
                      />
                      <span className="text-sm text-muted-foreground w-12">
                        {Math.round(questionAyePercentage)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Topic: {question.topic}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Speakers */}
      {stats.details[0]?.speakers?.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">Key Speakers:</div>
          <div className="text-sm text-muted-foreground">
            {stats.details[0].speakers.slice(0, 3).join(', ')}
            {stats.details[0].speakers.length > 3 && ' and others'}
          </div>
        </div>
      )}
    </div>
  );
}

function VotingTrends({ selectedTimeframe }: { selectedTimeframe: 'daily' | 'weekly' | 'all' }) {
  const { user } = useAuth();
  const { data: stats } = useQuery<UserVotingStats>({
    queryKey: ['votingStats', user?.id, selectedTimeframe],
    queryFn: () => getUserVotingStats(selectedTimeframe),
    enabled: !!user,
  });

  if (!stats?.weeklyStats?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          No voting data available for this timeframe
        </div>
      </div>
    );
  }

  // Calculate totals once
  const totals = {
    ayes: stats.ayeVotes || 0,
    noes: stats.noVotes || 0,
    periods: stats.weeklyStats.length,
    periodLabel: selectedTimeframe === 'daily' ? 'Hours' : 
                 selectedTimeframe === 'weekly' ? 'Days' : 
                 'Weeks'
  };

  const chartData = stats.weeklyStats.map(stat => ({
    timestamp: stat.timestamp,
    Ayes: stat.ayes,
    Noes: stat.noes,
  }));

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">
              {totals.ayes}
            </div>
            <div className="text-sm text-muted-foreground">
              Aye Votes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-rose-600">
              {totals.noes}
            </div>
            <div className="text-sm text-muted-foreground">
              No Votes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {totals.periods}
            </div>
            <div className="text-sm text-muted-foreground">
              Active {totals.periodLabel}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Updated Chart component */}
      <DynamicChart 
        data={chartData} 
        timeframe={selectedTimeframe} 
      />
    </div>
  );
}