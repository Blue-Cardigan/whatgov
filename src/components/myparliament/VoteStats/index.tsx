'use client';

import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TrendingUp, ChevronDown, LayoutDashboard, Users, LayoutGrid, FolderKanban, Clock, MessageSquare, Vote, Scale } from "lucide-react";
import { useState, useMemo } from "react";
import { TOPICS } from "@/lib/utils";
import type { 
  TopicStats,
  TopicStatsEntry,
  TopicWithName,
  UserTopicStats,
  UserTopicStatsEntry
} from "@/types/VoteStats";
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useVotes } from "@/hooks/useVotes";
import { AiTopic } from "@/types";
import { DemographicComparison } from "./DemographicComparison";
import { TopicInsights } from './TopicInsights';
import { TopicComparison } from './TopicComparison';
import { calculateEngagementScore, calculateAgreementRate, calculateConsistencyScore } from './utils/scoring';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const VotingTrendsChart = dynamic(() => import('./VotingTrendsChart').then(mod => mod.VotingTrendsChart), {
  loading: () => <div className="h-[300px] flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
});

interface TopicStatCardProps {
  topic: AiTopic;
  stats: TopicStatsEntry;
  showTopQuestions?: boolean;
  showVoteHistory?: boolean;
  isUserVotes?: boolean;
}

function TopicStatCard({ 
  topic, 
  stats, 
  showVoteHistory = false,
  isUserVotes = false 
}: TopicStatCardProps) {
  const aye_votes = Number(stats.aye_votes) || 0;
  const no_votes = Number(stats.no_votes) || 0;
  const totalVotes = aye_votes + no_votes;
  const ayePercentage = totalVotes > 0 ? (aye_votes / totalVotes) * 100 : 0;
  
  const topicInfo = TOPICS.find(t => t.label === topic.name);
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="space-y-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      {/* Topic Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {topicInfo?.icon && (
              <topicInfo.icon className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="font-medium">{topic.name}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            {totalVotes.toLocaleString()} {isUserVotes ? 'of your votes' : 'total votes'}
          </div>
        </div>

        {/* Speakers */}
        {topic.speakers.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Key speakers: {topic.speakers.slice(0, 2).join(', ')}
            {topic.speakers.length > 2 && ' and others'}
          </div>
        )}
        
        {/* Subtopics */}
        {topic.subtopics.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {topic.subtopics.slice(0, 2).join(', ')}
            {topic.subtopics.length > 2 && '...'}
          </div>
        )}
        
        {/* Vote Distribution - Updated */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {isUserVotes ? 'Your Votes' : 'Overall Votes'}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalVotes.toLocaleString()} {isUserVotes ? 'votes by you' : 'votes cast'}
            </div>
          </div>

          {totalVotes > 0 ? (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-600 font-medium">
                  {Math.round(ayePercentage)}% Ayes ({aye_votes.toLocaleString()})
                </span>
                <span className="text-rose-600 font-medium">
                  {Math.round(100 - ayePercentage)}% Noes ({no_votes.toLocaleString()})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-muted flex">
                <div 
                  className="bg-emerald-600/90 h-full transition-all duration-500 ease-out rounded-l-full"
                  style={{ width: `${ayePercentage}%` }}
                />
                <div 
                  className="bg-rose-600/90 h-full transition-all duration-500 ease-out rounded-r-full"
                  style={{ width: `${100 - ayePercentage}%` }}
                />
              </div>
              
              {/* Recent Questions - Updated */}
              {showVoteHistory && stats.vote_history ? (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">Your Recent Votes</div>
                  {stats.vote_history.slice(0, 3).map((vote, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="text-muted-foreground">{vote.question}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${vote.vote ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Voted {vote.vote ? 'Aye' : 'Noe'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(vote.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.top_questions && stats.top_questions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {stats.top_questions.slice(0, 2).map((q, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="text-muted-foreground">{q.question}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium">
                          {q.aye_votes.toLocaleString()} ayes
                        </span>
                        <span className="text-rose-600 font-medium">
                          {q.no_votes.toLocaleString()} noes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No votes recorded this month
            </div>
          )}
        </div>
      </div>

      {/* Show vote history if enabled */}
      {showVoteHistory && stats.vote_history && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Questions
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
          
          <div className={`space-y-4 pl-4 border-l-2 border-muted overflow-hidden transition-all duration-200 ease-in-out
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {stats.vote_history.slice(0, 5).map((vote, index) => (
              <div key={index} className="text-sm space-y-1">
                <div className="font-medium">{vote.question}</div>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${vote.vote ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Voted {vote.vote ? 'Aye' : 'Noe'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(vote.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Add these transformation functions at the top of the file
const transformUserTopicStatsToTopicStats = (
  userTopicStats: Record<string, UserTopicStatsEntry>
): Record<string, TopicStatsEntry> => {
  return Object.fromEntries(
    Object.entries(userTopicStats || {}).map(([topic, stats]) => [
      topic,
      {
        total_votes: stats.total_votes,
        aye_votes: stats.aye_votes,
        no_votes: stats.no_votes,
        vote_history: stats.vote_history || [],
        speakers: stats.speakers || [],
        frequency: stats.frequency || 0,
        subtopics: stats.subtopics || [],
        top_questions: stats.top_questions || []
      }
    ])
  );
};

const transformToTopicWithName = (
  userTopicStats: Record<string, UserTopicStatsEntry>
): TopicWithName[] => {
  return Object.entries(userTopicStats || {})
    .map(([topicName, stats]) => ({
      name: topicName,
      total_votes: stats.total_votes,
      aye_votes: stats.aye_votes,
      no_votes: stats.no_votes,
      vote_history: stats.vote_history || [],
      speakers: stats.speakers || [],
      frequency: stats.frequency || 0,
      subtopics: stats.subtopics || [],
      top_questions: stats.top_questions || [],
      engagement_score: calculateEngagementScore(stats as TopicStatsEntry),
      agreement_rate: calculateAgreementRate(stats as TopicStatsEntry),
      consistency_score: calculateConsistencyScore(stats as TopicStatsEntry)
    }))
    .filter(topic => topic.total_votes > 0)
    .slice(0, 4);
};

// First, add a transformation function for overall stats
const transformTopicStatsForChart = (
  topicStats: TopicStats | undefined
): Record<string, TopicStatsEntry> => {
  if (!topicStats?.topics) return {};
  
  return Object.entries(topicStats.topics).reduce<Record<string, TopicStatsEntry>>(
    (acc, [topic, stats]) => ({
      ...acc,
      [topic]: {
        total_votes: stats.total_votes,
        aye_votes: stats.aye_votes,
        no_votes: stats.no_votes,
        vote_history: stats.vote_history || [],
        speakers: stats.speakers || [],
        frequency: stats.frequency || 0,
        subtopics: stats.subtopics || [],
        top_questions: stats.top_questions || []
      }
    }), 
    {}
  );
};

export function VoteStats() {
  const { topicVoteStats, userTopicVotes, demographicStats } = useVotes();
  const [groupBy, setGroupBy] = useState<'all' | 'topic'>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'recent' | 'agreement'>('votes');

  // Transform votes for charts and insights
  const transformedVotes = useMemo(() => {
    if (!userTopicVotes?.user_topics) return {};
    return userTopicVotes.user_topics;
  }, [userTopicVotes]);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="popular">
                <TrendingUp className="h-4 w-4 mr-2" />
                Popular Questions
              </TabsTrigger>
              <TabsTrigger value="your-votes">
                <Users className="h-4 w-4 mr-2" />
                Your Votes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-8">
                {/* Summary Stats - Using overall stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                          <h3 className="text-2xl font-bold mt-1">
                            {Object.values(topicVoteStats?.topics || {}).reduce((sum, topic) => 
                              sum + (topic.top_questions?.length || 0), 0
                            ).toLocaleString()}
                          </h3>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Votes Cast</p>
                          <h3 className="text-2xl font-bold mt-1">
                            {Object.values(topicVoteStats?.topics || {}).reduce((sum, stats) => 
                              sum + (stats.total_votes || 0), 0).toLocaleString()}
                          </h3>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Overall Agreement</p>
                          <h3 className="text-2xl font-bold mt-1">
                            {Math.round(
                              (Object.values(topicVoteStats?.topics || {}).reduce((sum, stats) => 
                                sum + (stats.aye_votes || 0), 0) / 
                              Object.values(topicVoteStats?.topics || {}).reduce((sum, stats) => 
                                sum + (stats.total_votes || 0), 0)) * 100
                            )}%
                          </h3>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overview Charts - Using overall stats */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Overall Voting Trends</h3>
                  <div className="rounded-lg bg-card">
                    <VotingTrendsChart 
                      topicVotes={topicVoteStats?.topics || {}}
                      isUserVotes={false}
                    />
                  </div>
                </div>

                {/* Demographic Comparison - Already using overall stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Demographic Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DemographicComparison
                      demographicComparison={{
                        gender: demographicStats?.gender_breakdown,
                        age_group: demographicStats?.age_breakdown
                      }}
                      constituencyBreakdown={demographicStats?.constituency_breakdown}
                      isOverview={true}
                    />
                  </CardContent>
                </Card>

                {/* Topic Insights - Switch to overall stats */}
                <TopicInsights 
                  topicStats={topicVoteStats?.topics || {}}
                />

                {/* Topic Comparison - Switch to overall stats */}
                <TopicComparison 
                  topics={Object.entries(topicVoteStats?.topics || {}).map(([name, stats]) => ({
                    name,
                    ...stats,
                    engagement_score: calculateEngagementScore(stats),
                    agreement_rate: calculateAgreementRate(stats),
                    consistency_score: calculateConsistencyScore(stats)
                  }))}
                />

              </div>
            </TabsContent>

            <TabsContent value="popular">
              <div className="space-y-6">
                {/* Header with controls */}
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Filters Card */}
                      <Card className="flex items-center gap-6 p-2">
                        {/* View Toggle */}
                        <div className="flex items-center gap-2 px-2">
                          <Button
                            variant={groupBy === 'all' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setGroupBy('all')}
                            className="text-sm"
                          >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            All Questions
                          </Button>
                          <Button
                            variant={groupBy === 'topic' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setGroupBy('topic')}
                            className="text-sm"
                          >
                            <FolderKanban className="h-4 w-4 mr-2" />
                            By Topic
                          </Button>
                        </div>

                        {/* Separator */}
                        <Separator orientation="vertical" className="h-8" />

                        {/* Sort Options */}
                        <div className="flex items-center gap-2 pr-2">
                          <span className="text-sm text-muted-foreground">Sort:</span>
                          <Select
                            value={sortBy}
                            onValueChange={(value) => setSortBy(value as typeof sortBy)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Vote Count</SelectLabel>
                                <SelectItem value="votes">
                                  <div className="flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Most Voted
                                  </div>
                                </SelectItem>
                                <SelectItem value="recent">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Most Recent
                                  </div>
                                </SelectItem>
                                <SelectItem value="agreement">
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    Highest Agreement
                                  </div>
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {topicVoteStats?.topics && Object.entries(topicVoteStats.topics).length > 0 ? (
                      groupBy === 'topic' ? (
                        // Grouped by topic view
                        Object.entries(topicVoteStats.topics)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([topicName, stats]) => (
                            <Card key={topicName} className="p-6">
                              <div className="space-y-4">
                                {/* Topic Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const Icon = TOPICS.find(t => t.label === topicName)?.icon;
                                      return Icon && <Icon className="h-5 w-5 text-muted-foreground" />;
                                    })()}
                                    <h4 className="font-medium">{topicName}</h4>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {Number(stats.total_votes).toLocaleString()} total votes
                                  </div>
                                </div>

                                {/* Questions List */}
                                <div className="space-y-4">
                                  {stats.top_questions
                                    ?.sort((a, b) => {
                                      switch (sortBy) {
                                        case 'votes':
                                          return (b.aye_votes + b.no_votes) - (a.aye_votes + a.no_votes);
                                        case 'recent':
                                          const aVote = stats.vote_history?.find(v => v.question === a.question);
                                          const bVote = stats.vote_history?.find(v => v.question === b.question);
                                          if (!aVote?.created_at) return 1;
                                          if (!bVote?.created_at) return -1;
                                          return new Date(bVote.created_at).getTime() - new Date(aVote.created_at).getTime();
                                        case 'agreement':
                                          const aTotal = a.aye_votes + a.no_votes;
                                          const bTotal = b.aye_votes + b.no_votes;
                                          return (b.aye_votes / bTotal) - (a.aye_votes / aTotal);
                                        default:
                                          return 0;
                                      }
                                    })
                                    .map((question, idx) => (
                                      <div key={idx} className="space-y-2">
                                        <p className="text-sm font-medium">{question.question}</p>
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="flex items-center gap-4">
                                            <span className="text-emerald-600">
                                              {Number(question.aye_votes).toLocaleString()} ayes
                                            </span>
                                            <span className="text-rose-600">
                                              {Number(question.no_votes).toLocaleString()} noes
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span className="text-muted-foreground">
                                              {Number(question.aye_votes + question.no_votes).toLocaleString()} votes
                                            </span>
                                            {stats.vote_history?.find(v => v.question === question.question)?.created_at && (
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(stats.vote_history.find(v => v.question === question.question)!.created_at).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <Progress 
                                          value={(question.aye_votes / (question.aye_votes + question.no_votes)) * 100} 
                                          className="h-1.5"
                                        />
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </Card>
                          ))
                      ) : (
                        // Flat list of all questions
                        <div className="space-y-4">
                          {Object.entries(topicVoteStats.topics).flatMap(([topicName, stats]) =>
                            (stats.top_questions || []).map((question) => ({
                              topic: topicName,
                              question: question.question,
                              aye_votes: question.aye_votes,
                              no_votes: question.no_votes,
                              total_votes: question.aye_votes + question.no_votes,
                              created_at: stats.vote_history?.find(v => v.question === question.question)?.created_at || ''
                            }))
                          )
                          .sort((a, b) => {
                            switch (sortBy) {
                              case 'votes':
                                return b.total_votes - a.total_votes;
                              case 'recent':
                                if (!a.created_at) return 1;
                                if (!b.created_at) return -1;
                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                              case 'agreement':
                                const aAgreement = a.aye_votes / a.total_votes;
                                const bAgreement = b.aye_votes / b.total_votes;
                                return bAgreement - aAgreement;
                              default:
                                return 0;
                            }
                          })
                          .map((question, idx) => (
                            <Card key={idx} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {(() => {
                                    const Icon = TOPICS.find(t => t.label === question.topic)?.icon;
                                    return Icon && <Icon className="h-4 w-4" />;
                                  })()}
                                  <span>{question.topic}</span>
                                </div>
                                <p className="font-medium">{question.question}</p>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4">
                                    <span className="text-emerald-600 font-medium">
                                      {Number(question.aye_votes).toLocaleString()} ayes
                                    </span>
                                    <span className="text-rose-600 font-medium">
                                      {Number(question.no_votes).toLocaleString()} noes
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-muted-foreground">
                                      {Number(question.total_votes).toLocaleString()} votes
                                    </span>
                                    {question.created_at && (
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(question.created_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Progress 
                                  value={(question.aye_votes / question.total_votes) * 100} 
                                  className="h-1.5"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No questions have been voted on yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="your-votes">
              <div className="space-y-8">
                {/* Voting Trends Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Your Voting Trends</h3>
                  <div className="rounded-lg bg-card">
                    <VotingTrendsChart 
                      topicVotes={transformUserTopicStatsToTopicStats(transformedVotes)}
                      isUserVotes={true}
                    />
                  </div>
                </div>

                {/* Topic Insights */}
                <TopicInsights 
                  topicStats={transformUserTopicStatsToTopicStats(transformedVotes)} 
                />

                {/* Topic Comparison */}
                <TopicComparison 
                  topics={transformToTopicWithName(transformedVotes)}
                />

                {/* Your Topic Votes Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Your Topic Votes</h3>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                      {userTopicVotes?.user_topics && Object.entries(userTopicVotes.user_topics)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([topic, stats]) => (
                          <TopicStatCard
                            key={topic}
                            topic={{
                              name: topic,
                              speakers: stats.speakers || [],
                              frequency: stats.frequency || 0,
                              subtopics: stats.subtopics || []
                            }}
                            stats={stats as TopicStatsEntry}
                            showVoteHistory={true}
                            isUserVotes={true}
                          />
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}