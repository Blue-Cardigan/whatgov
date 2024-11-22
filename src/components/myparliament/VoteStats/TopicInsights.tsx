import { PatternCard } from "./PatternCard";
import { getTopicsByAgreement } from "./utils/getTopicsByAgreement";
import type { TopicStatsEntry } from "@/types/VoteStats";

interface TopicInsightsProps {
    topicStats: Record<string, TopicStatsEntry>;
}
  
  export const TopicInsights = ({ topicStats }: TopicInsightsProps) => (
    <div className="space-y-4">
      {/* Top Topics by Engagement */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="text-lg font-medium mb-4">Your Most Active Topics</h3>
        <div className="space-y-3">
          {Object.entries(topicStats)
            .sort(([, a], [, b]) => b.total_votes - a.total_votes)
            .slice(0, 5)
            .map(([topic, stats]) => (
              <div key={topic} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{topic}</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.total_votes} votes
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-emerald-600">{Math.round((stats.aye_votes / stats.total_votes) * 100)}% </span>
                  agreement rate
                </div>
              </div>
            ))}
        </div>
      </div>
  
      {/* Voting Pattern Analysis */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="text-lg font-medium mb-4">Voting Patterns</h3>
        <div className="grid grid-cols-2 gap-4">
          <PatternCard
            title="Most Agreed Topics"
            topics={getTopicsByAgreement(topicStats, true)}
          />
          <PatternCard
            title="Most Disagreed Topics"
            topics={getTopicsByAgreement(topicStats, false)}
          />
        </div>
      </div>
    </div>
  );