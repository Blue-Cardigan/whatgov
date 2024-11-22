import type { TopicStatsEntry } from "@/types/VoteStats";

export const calculateEngagementScore = (stats: TopicStatsEntry): number => {
  const totalVotes = (stats.aye_votes || 0) + (stats.no_votes || 0);
  const voteHistory = stats.vote_history || [];
  
  // Calculate recency factor
  const recentVotes = voteHistory
    .filter(v => new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .length;

  return Math.min(100, (totalVotes * 10) + (recentVotes * 20));
};

export const calculateAgreementRate = (stats: TopicStatsEntry): number => {
  const totalVotes = (stats.aye_votes || 0) + (stats.no_votes || 0);
  return totalVotes > 0 ? ((stats.aye_votes || 0) / totalVotes) * 100 : 0;
};

export const calculateConsistencyScore = (stats: TopicStatsEntry): number => {
  if (!stats.vote_history || stats.vote_history.length < 2) return 100;

  const votes = stats.vote_history.map(v => v.vote);
  let changes = 0;
  
  for (let i = 1; i < votes.length; i++) {
    if (votes[i] !== votes[i - 1]) changes++;
  }

  return Math.max(0, 100 - (changes / votes.length) * 100);
}; 