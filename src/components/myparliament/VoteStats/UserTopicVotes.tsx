import { ScrollArea } from "@/components/ui/scroll-area";
import { TopicStatCard } from "./subcomponents/TopicStatCard";
import type { TopicStatsEntry, UserTopicStats } from "@/types/VoteStats";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";

interface UserTopicVotesProps {
  userTopicVotes: UserTopicStats | undefined;
}

export function UserTopicVotes({ userTopicVotes }: UserTopicVotesProps) {
  const { isEngagedCitizen } = useAuth();

  if (!isEngagedCitizen) {
    return (
      <SubscriptionCTA
        title="Upgrade to see your topic voting history"
        description="Get detailed insights into how you vote across different topics."
        features={[
          "Track your votes by topic",
          "See your agreement rates",
          "View your voting history",
          "Analyze your voting patterns"
        ]}
      />
    );
  }

  if (!userTopicVotes?.user_topics) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No voting history available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your Topic Votes</h3>
        <span className="text-sm text-muted-foreground">
          Based on your voting history
        </span>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-6">
          {Object.entries(userTopicVotes.user_topics)
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
  );
} 