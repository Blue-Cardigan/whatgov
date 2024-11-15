'use client';

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle,
  Tags,
  TrendingUp,
  Activity,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserVotingStats } from '@/lib/supabase'
import { TOPICS } from "@/lib/utils";
import type { UserVotingStats, TopicStats, TopicQuestion, TopicDetails } from "@/types/VoteStats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

function StatRow() {
  const { user } = useAuth();
  const [selectedTimeframe] = useState<'week' | 'month' | 'year'>('month');

  const { data: stats } = useQuery<UserVotingStats>({
    queryKey: ['votingStats', user?.id, selectedTimeframe],
    queryFn: () => getUserVotingStats(selectedTimeframe),
    enabled: !!user,
  });

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2 flex-1">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{stats?.totalVotes || 0}</span>
          <span className="text-xs text-muted-foreground">Total Votes</span>
        </div>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex items-center gap-2 flex-1">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-emerald-600">{stats?.ayeVotes || 0}</span>
          <span className="text-xs text-muted-foreground">Aye Votes</span>
        </div>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex items-center gap-2 flex-1">
        <XCircle className="h-4 w-4 text-rose-600" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-rose-600">{stats?.noVotes || 0}</span>
          <span className="text-xs text-muted-foreground">No Votes</span>
        </div>
      </div>
    </div>
  );
}

export function UserVoteHistory() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');

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
      {/* Timeframe Selection */}
      <div className="flex justify-end gap-2">
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

      {/* Overview Stats */}
      <StatRow />

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

function VotingTrends() {
  const { user } = useAuth();
  const [selectedTimeframe] = useState<'week' | 'month' | 'year'>('month');

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

  const chartData = stats.weeklyStats.map(week => ({
    week: format(new Date(week.week), 'MMM d'),
    Ayes: week.ayes,
    Noes: week.noes,
    Total: week.ayes + week.noes,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">
              {chartData.reduce((sum, week) => sum + week.Ayes, 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Aye votes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-rose-600">
              {chartData.reduce((sum, week) => sum + week.Noes, 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total No votes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {chartData.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Weeks of activity
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Ayes" fill="#10b981" stackId="stack" /> {/* emerald-600 */}
            <Bar dataKey="Noes" fill="#e11d48" stackId="stack" /> {/* rose-600 */}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}