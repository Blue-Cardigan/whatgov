'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LayoutGrid, FolderKanban, Globe2, MapPin } from "lucide-react";
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
import { SubscriptionCTA } from "@/components/ui/subscription-cta";
import { QuestionStats } from "@/types/VoteStats";
import { Badge } from "@/components/ui/badge";

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
    
    // Helper to transform questions data
    const transformQuestions = (questions: any[]): QuestionStats[] => {
      if (!Array.isArray(questions)) return [];
      return questions
        .filter(q => q && typeof q === 'object')
        .map(q => ({
          question: String(q.question || ''),
          total_votes: Number(q.total_votes || 0),
          aye_votes: Number(q.aye_votes || 0),
          no_votes: Number(q.no_votes || 0),
          debate_id: String(q.debate_id || ''),
          created_at: String(q.created_at || ''),
          topic: String(q.topic || '')
        }));
    };

    const userConstituency = demographicStats.user_demographics?.constituency;
    
    return {
      userDemographics: demographicStats.user_demographics,
      constituencyStats: userConstituency ? {
        total_votes: Number(demographicStats.constituency_breakdown?.[userConstituency]?.total_votes || 0),
        aye_votes: Number(demographicStats.constituency_breakdown?.[userConstituency]?.aye_votes || 0),
        no_votes: Number(demographicStats.constituency_breakdown?.[userConstituency]?.no_votes || 0)
      } : undefined,
      demographicComparison: {
        gender: Object.fromEntries(
          Object.entries(demographicStats.gender_breakdown || {})
            .filter(([gender]) => gender)
            .map(([gender, stats]) => [
              gender,
              {
                total_votes: Number(stats.total_votes || 0),
                aye_percentage: Number(stats.aye_percentage || 0),
                questions: transformQuestions(stats.questions || [])
              }
            ])
        ),
        age_group: Object.fromEntries(
          Object.entries(demographicStats.age_breakdown || {})
            .filter(([age]) => age)
            .map(([age, stats]) => [
              age,
              {
                total_votes: Number(stats.total_votes || 0),
                aye_percentage: Number(stats.aye_percentage || 0),
                questions: transformQuestions(stats.questions || [])
              }
            ])
        )
      },
      constituencyBreakdown: Object.fromEntries(
        Object.entries(demographicStats.constituency_breakdown || {})
          .filter(([constituency]) => constituency)
          .map(([constituency, stats]) => [
            constituency,
            {
              total_votes: Number(stats.total_votes || 0),
              aye_votes: Number(stats.aye_votes || 0),
              no_votes: Number(stats.no_votes || 0),
              questions: transformQuestions(stats.questions || [])
            }
          ])
      )
    };
  }, [demographicStats]);

  // BasicStats Component - Updated without animations
  const BasicStats = () => {
    const userConstituency = demographicStats?.user_demographics?.constituency;

    return (
      <TabsContent value="popular" className="space-y-4">
        <Card className="p-2 border-0 shadow-none">
          <Tabs defaultValue="uk" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="uk">
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4" />
                    UK
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="constituency" 
                  disabled={!userConstituency}
                  title={!userConstituency ? "Set your constituency to view local data" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Local
                  </div>
                </TabsTrigger>
              </TabsList>
              
              {userConstituency && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {userConstituency}
                </Badge>
              )}
            </div>

            <TabsContent value="uk" className="mt-0">
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

            <TabsContent value="constituency" className="mt-0">
              <div className="space-y-6">
                {demographicStats?.constituency_breakdown ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-4">
                      Showing voting patterns in {userConstituency}
                    </div>
                    <DemographicComparison
                      userDemographics={demographicData.userDemographics}
                      constituencyStats={demographicData.constituencyStats}
                      demographicComparison={demographicData.demographicComparison}
                      constituencyBreakdown={demographicData.constituencyBreakdown}
                      showUpgradePrompt={true}
                    />
                  </>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">No Constituency Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Set your constituency in your profile to view local voting patterns
                    </p>
                  </div>
                )}
                <SubscriptionCTA
                  title="Upgrade to see your constituency's voting patterns"
                  description="Get detailed insights into how your constituency votes on different issues."
                  features={[
                    "See how your constituency compares to others",
                    "Track local voting patterns",
                    "Get constituency-specific insights"
                  ]}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </TabsContent>
    );
  };

  // EngagedCitizenStats Component - Updated without animations
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
          {/* Filter Controls Card */}
          <Card className="p-0 border-0 shadow-none">
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

      {/* Your Votes Tab */}
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
        <DemographicComparison 
          userDemographics={demographicData.userDemographics}
          constituencyStats={demographicData.constituencyStats}
          demographicComparison={demographicData.demographicComparison}
          constituencyBreakdown={demographicData.constituencyBreakdown}
          isOverview={true}
          showUpgradePrompt={false}
        />
      </TabsContent>
    </>
  );

  return (
    <AuthenticatedRoute>
      <Card className="p-0">
        <CardContent className="pt-4">
          <Tabs defaultValue="popular" className="space-y-4">
            {isEngagedCitizen ? <EngagedCitizenStats /> : <BasicStats />}
          </Tabs>
        </CardContent>
      </Card>
    </AuthenticatedRoute>
  );
}