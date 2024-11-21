'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tags, TrendingUp, ChevronDown, ArrowDownAZ, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { TOPICS } from "@/lib/utils";
import type { 
  TopicStats, 
  TopicVotes 
} from "@/types/VoteStats";
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useVotes } from "@/hooks/useVotes";
import { AiTopic } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopicStatCardSkeleton } from "./TopicStatCardSkeleton";

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
        
        {/* Vote Distribution - Updated design */}
        <div className="space-y-2">
          {totalVotes > 0 ? (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-600 font-medium">{Math.round(ayePercentage)}%</span>
                <span className="text-rose-600 font-medium">{Math.round(100 - ayePercentage)}%</span>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{aye_votes} Ayes</span>
                <span>{no_votes} Noes</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No votes recorded
            </div>
          )}
        </div>
      </div>

      {/* Show vote history if enabled - Updated animation */}
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
              Recent Votes
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
          
          <div className={`space-y-4 pl-4 border-l-2 border-muted overflow-hidden transition-all duration-200 ease-in-out
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
        </div>
      )}
    </div>
  );
}

export function UserVoteHistory() {
  const { topicVoteStats, userTopicVotes, isLoading } = useVotes();
  const [sortBy, setSortBy] = useState<'name' | 'votes'>('votes');

  // Transform userTopicVotes to match TopicVotes type
  const transformedVotes: TopicVotes = userTopicVotes?.user_topics 
    ? Object.entries(userTopicVotes.user_topics).reduce<TopicVotes>((acc, [topic, stats]) => ({
        ...acc,
        [topic]: {
          aye_votes: Number(stats.aye_votes) || 0,
          no_votes: Number(stats.no_votes) || 0,
          total_votes: Number(stats.total_votes) || 0,
          vote_history: stats.vote_history?.map(vote => ({
            ...vote,
            title: vote.title || vote.question,
            topic: vote.topic || topic
          }))
        }
      }), {})
    : {};


  if (isLoading) {
    return (
      <div className="space-y-4">
        <TopicStatCardSkeleton />
        <TopicStatCardSkeleton />
        <TopicStatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          <Tabs defaultValue="topics" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="topics">
                  <Tags className="h-4 w-4 mr-2" />
                  Popular This Month
                </TabsTrigger>
                <TabsTrigger value="your-votes">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Your Votes
                </TabsTrigger>
              </TabsList>

              {/* Only show sort select on topics tab */}
              <div className="topics-sort-select" data-state="visible">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'name' | 'votes')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">
                      <span className="flex items-center gap-2">
                        <ArrowDownAZ className="h-4 w-4" />
                        Sort by Name
                      </span>
                    </SelectItem>
                    <SelectItem value="votes">
                      <span className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Sort by Votes
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="topics">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {topicVoteStats?.topics && Object.entries(topicVoteStats.topics).length > 0 ? (
                    Object.entries(topicVoteStats.topics)
                      .sort(([a, aStats], [b, bStats]) => {
                        if (sortBy === 'name') return a.localeCompare(b);
                        return (bStats.total_votes || 0) - (aStats.total_votes || 0);
                      })
                      .map(([topicName, stats]) => {
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
            </TabsContent>

            <TabsContent value="your-votes">
              <div className="space-y-8">
                {/* Voting Trends Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Voting Trends by Topic</h3>
                  <div className="rounded-lg border bg-card">
                    <VotingTrendsChart userTopicVotes={transformedVotes} />
                  </div>
                </div>

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
                            showVoteHistory={true}
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