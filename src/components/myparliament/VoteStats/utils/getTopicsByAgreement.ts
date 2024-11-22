import { VoteHistoryEntry } from "@/types/VoteStats";

interface TopicStats {
  [key: string]: {
    total_votes: number;
    aye_votes: number;
    no_votes: number;
    vote_history?: VoteHistoryEntry[];
  };
}

export function getTopicsByAgreement(
  topicStats: TopicStats,
  mostAgreed: boolean
): Array<{ topic: string; agreement: number; total_votes: number }> {
  return Object.entries(topicStats)
    .filter(([, stats]) => stats.total_votes > 0)
    .map(([topic, stats]) => ({
      topic,
      agreement: Math.round((stats.aye_votes / stats.total_votes) * 100),
      total_votes: stats.total_votes
    }))
    .sort((a, b) => mostAgreed ? b.agreement - a.agreement : a.agreement - b.agreement)
    .slice(0, 3);
} 