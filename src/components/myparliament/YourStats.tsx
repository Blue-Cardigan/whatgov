'use client';

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tags, TrendingUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { TOPICS } from "@/lib/utils";
import type { 
  TopicStats, 
  TopicVotes,
  VoteHistoryEntry 
} from "@/types/VoteStats";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useVotes } from "@/hooks/useVotes";
import { AiTopic } from "@/types";

const VotingTrendsChart = dynamic(() => import('./VotingTrendsChart').then(mod => mod.VotingTrendsChart), {
  loading: () => <div className="h-[300px] flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
});

interface TopicStatCardProps {
  topic: AiTopic;
  stats: TopicStats;
  showTopQuestions?: boolean;
  showVoteHistory?: boolean;
}

function TopicStatCard({ 
  topic, 
  stats, 
  showVoteHistory = false 
}: TopicStatCardProps) {
  const aye_votes = Number(stats.aye_votes) || 0;
  const no_votes = Number(stats.no_votes) || 0;
  const totalVotes = aye_votes + no_votes;
  const ayePercentage = totalVotes > 0 ? (aye_votes / totalVotes) * 100 : 0;
  
  // Find matching topic info by exact label match
  const topicInfo = TOPICS.find(t => t.label === topic.name);
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="space-y-4">
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
            {totalVotes} votes
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
        
        {/* Vote Distribution */}
        <div className="space-y-1">
          {totalVotes > 0 ? (
            <div className="h-2 w-full rounded-full overflow-hidden bg-muted flex">
              <div 
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${ayePercentage}%` }}
              />
              <div 
                className="bg-rose-600 h-full transition-all duration-500"
                style={{ width: `${100 - ayePercentage}%` }}
              />
            </div>
          ) : (
            <div className="h-2 w-full rounded-full bg-muted" />
          )}
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">{aye_votes} Ayes ({Math.round(ayePercentage)}%)</span>
            <span className="text-rose-600">{no_votes} Noes ({Math.round(100 - ayePercentage)}%)</span>
          </div>
        </div>
      </div>

      {/* Show vote history if enabled */}
      {showVoteHistory && stats.vote_history && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span>Recent Votes</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
          
          {isExpanded && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              {stats.vote_history.slice(0, 5).map((vote, index) => (
                <div key={index} className="text-sm space-y-1">
                  <div className="font-medium">{vote.title || vote.question}</div>
                  <div className={`text-sm ${vote.vote ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Voted {vote.vote ? 'Aye' : 'Noe'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(vote.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UserVoteHistory() {
  const { user } = useAuth();
  const { 
    topicVoteStats, 
    userTopicVotes, 
    isLoading 
  } = useVotes();
  
  // Transform the data to match expected types
  const transformedUserTopicVotes = userTopicVotes?.user_topics 
    ? Object.entries(userTopicVotes.user_topics).reduce<TopicVotes>((acc, [topic, stats]) => ({
        ...acc,
        [topic]: {
          aye_votes: Number(stats.aye_votes) || 0,
          no_votes: Number(stats.no_votes) || 0,
          total_votes: Number(stats.total_votes) || 0,
          vote_history: stats.vote_history?.map((vote: VoteHistoryEntry) => ({
            ...vote,
            title: vote.title || vote.question,
            topic: vote.topic || topic
          }))
        }
      }), {})
    : {};

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to view your voting history"
        description="Track your voting patterns and see how they align with different topics and MPs"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Your Voting History</h2>

      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">
            <Tags className="h-4 w-4 mr-2" />
            This Month&apos;s Votes
          </TabsTrigger>
          <TabsTrigger value="your-votes">
            <TrendingUp className="h-4 w-4 mr-2" />
            Your Votes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Topic Voting Activity This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {topicVoteStats?.topics && Object.entries(topicVoteStats.topics).length > 0 ? (
                    Object.entries(topicVoteStats.topics)
                      .sort(([a], [b]) => a.localeCompare(b)) // Sort topics alphabetically
                      .map(([topicName, stats]) => {
                        // Ensure the topic object matches the AiTopic interface
                        const topicData: AiTopic = {
                          name: topicName,
                          speakers: Array.isArray(stats.speakers) ? stats.speakers : [],
                          frequency: typeof stats.frequency === 'number' ? stats.frequency : 1,
                          subtopics: Array.isArray(stats.subtopics) ? stats.subtopics : []
                        };

                        return (
                          <TopicStatCard
                            key={topicName}
                            topic={topicData}
                            stats={{
                              aye_votes: Number(stats.aye_votes) || 0,
                              no_votes: Number(stats.no_votes) || 0,
                              total_votes: Number(stats.total_votes) || 0,
                              top_questions: stats.top_questions,
                              vote_history: stats.vote_history
                            }}
                            showTopQuestions={true}
                          />
                        );
                      })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No votes recorded this month
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="your-votes" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Voting Trends by Topic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VotingTrendsChart userTopicVotes={transformedUserTopicVotes} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Your Topic Votes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {userTopicVotes?.user_topics && Object.entries(userTopicVotes.user_topics).map(([topic, stats]) => (
                      <TopicStatCard
                        key={topic}
                        topic={{
                          name: topic,
                          speakers: stats.speakers || [],
                          frequency: stats.frequency || 1,
                          subtopics: stats.subtopics || []
                        }}
                        stats={{
                          aye_votes: Number(stats.aye_votes) || 0,
                          no_votes: Number(stats.no_votes) || 0,
                          total_votes: Number(stats.total_votes) || 0,
                          top_questions: stats.top_questions,
                          vote_history: stats.vote_history
                        }}
                        showTopQuestions={true}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}