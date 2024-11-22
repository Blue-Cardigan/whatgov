'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LayoutGrid, FolderKanban } from "lucide-react";
import { useState, useMemo } from "react";
import type { 
  TopicStatsEntry,
  TopicWithName,
  UserTopicStatsEntry
} from "@/types/VoteStats";
import dynamic from 'next/dynamic';
import { useVotes } from "@/hooks/useVotes";
import { DemographicComparison } from "./DemographicComparison";
import { TopicInsights } from './TopicInsights';
import { TopicComparison } from './TopicComparison';
import { calculateEngagementScore, calculateAgreementRate, calculateConsistencyScore } from './utils/scoring';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { QuestionCard } from "./QuestionCard";
import { TopicGroupedQuestions } from './TopicGroupedQuestions';
import { FlatQuestionList } from './FlatQuestionList';
import { UserTopicVotes } from "./UserTopicVotes";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { AuthenticatedRoute } from "@/components/auth/AuthenticatedRoute";

const VotingTrendsChart = dynamic(() => import('./VotingTrendsChart').then(mod => mod.VotingTrendsChart), {
  loading: () => <DashboardSkeleton />
});

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

export function VoteStats() {
  const { isEngagedCitizen } = useAuth();
  const { topicVoteStats, userTopicVotes, demographicStats } = useVotes();
  const [groupBy, setGroupBy] = useState<'all' | 'topic'>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'recent' | 'agreement'>('votes');

  // Transform demographic stats for the comparison component
  const demographicData = useMemo(() => {
    if (!demographicStats) return {};
    
    return {
      userDemographics: demographicStats.userDemographics,
      constituencyStats: {
        total_votes: demographicStats.constituency_breakdown?.[demographicStats.userDemographics?.constituency || '']?.total_votes || 0,
        aye_votes: demographicStats.constituency_breakdown?.[demographicStats.userDemographics?.constituency || '']?.aye_votes || 0,
        no_votes: demographicStats.constituency_breakdown?.[demographicStats.userDemographics?.constituency || '']?.no_votes || 0
      },
      demographicComparison: {
        gender: demographicStats.gender_breakdown,
        age_group: demographicStats.age_breakdown
      },
      constituencyBreakdown: demographicStats.constituency_breakdown
    };
  }, [demographicStats]);

  // Basic Stats Component - Simplified View
  const BasicStats = () => (
    <TabsContent value="popular" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Popular Questions</h2>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="votes">Most Voted</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[650px] pr-4">
        <div className="grid gap-3">
          {topicVoteStats && Object.entries(topicVoteStats.topics)
            .flatMap(([topicName, stats]) =>
              (stats.top_questions || []).map(question => ({
                topic: topicName,
                ...question
              }))
            )
            .sort((a, b) => b.total_votes - a.total_votes)
            .map((question, idx) => (
              <QuestionCard 
                key={idx}
                question={question}
                showTopic={true}
                showDate={false}
              />
            ))}
        </div>
      </ScrollArea>
    </TabsContent>
  );

  // Enhanced Stats Component - Full Featured View
  const EngagedCitizenStats = () => (
    <>
      <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex mb-8">
        <TabsTrigger value="popular">Popular Questions</TabsTrigger>
        <TabsTrigger value="your-votes">Your Votes</TabsTrigger>
        <TabsTrigger value="demographics">Demographics</TabsTrigger>
      </TabsList>

      {/* Popular Questions Tab */}
      <TabsContent value="popular" className="space-y-6">
        <div className="flex flex-col gap-6">
          {/* Enhanced Filter Controls */}
          <Card className="p-2">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 grid grid-cols-2 sm:flex items-center gap-2">
                <Button
                  variant={groupBy === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupBy('all')}
                  className="w-full sm:w-auto"
                >
                  <LayoutGrid className="h-4 w-4 mr-2 shrink-0" />
                  All Questions
                </Button>
                <Button
                  variant={groupBy === 'topic' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupBy('topic')}
                  className="w-full sm:w-auto"
                >
                  <FolderKanban className="h-4 w-4 mr-2 shrink-0" />
                  By Topic
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as typeof sortBy)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sort Questions</SelectLabel>
                    <SelectItem value="votes">Most Voted</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="agreement">Highest Agreement</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Questions List */}
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid gap-4">
              {groupBy === 'topic' ? (
                <TopicGroupedQuestions 
                  topicVoteStats={topicVoteStats} 
                  sortBy={sortBy}
                />
              ) : (
                <FlatQuestionList 
                  topicVoteStats={topicVoteStats}
                  sortBy={sortBy}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>

      {/* Your Votes Tab - Analytics Dashboard */}
      <TabsContent value="your-votes" className="space-y-8">
        <VotingTrendsChart 
          topicVotes={transformUserTopicStatsToTopicStats(userTopicVotes?.user_topics || {})}
          isUserVotes={true}
        />
        <div className="grid md:grid-cols-2 gap-8">
          <TopicInsights 
            topicStats={transformUserTopicStatsToTopicStats(userTopicVotes?.user_topics || {})} 
          />
          <TopicComparison 
            topics={transformToTopicWithName(userTopicVotes?.user_topics || {})} 
          />
        </div>
        <UserTopicVotes userTopicVotes={userTopicVotes} />
      </TabsContent>

      {/* Demographics Tab */}
      <TabsContent value="demographics">
        <DemographicComparison {...demographicData} />
      </TabsContent>
    </>
  );

  return (
    <AuthenticatedRoute>
      <Card className="p-4">
        <CardContent className="pt-4">
          <Tabs defaultValue="popular" className="space-y-4">
            {isEngagedCitizen ? <EngagedCitizenStats /> : <BasicStats />}
          </Tabs>
        </CardContent>
      </Card>
    </AuthenticatedRoute>
  );
}