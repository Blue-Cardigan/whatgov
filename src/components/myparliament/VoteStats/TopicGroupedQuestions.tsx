import { TOPICS } from "@/lib/utils";
import { QuestionCard } from "./QuestionCard";
import type { TopicStats } from "@/types/VoteStats";

interface TopicGroupedQuestionsProps {
  topicVoteStats: TopicStats | undefined;
  sortBy: 'votes' | 'recent' | 'agreement';
}

interface Question {
  question: string;  // The actual question text
  topic: string;
  aye_votes: number;
  no_votes: number;
  total_votes: number;
  created_at?: string;
}

export function TopicGroupedQuestions({ topicVoteStats, sortBy }: TopicGroupedQuestionsProps) {
  if (!topicVoteStats) return null;

  const sortQuestions = (questions: Question[]) => {
    return questions.sort((a, b) => {
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
    });
  };

  return (
    <div className="space-y-8">
      {Object.entries(topicVoteStats.topics)
        .sort(([, a], [, b]) => b.total_votes - a.total_votes)
        .map(([topicName, stats]) => {
          const topicInfo = TOPICS.find(t => t.label === topicName);
          const Icon = topicInfo?.icon;

          if (!stats.top_questions?.length) return null;

          return (
            <div key={topicName} className="space-y-4">
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                <h3 className="text-lg font-medium">{topicName}</h3>
                <span className="text-sm text-muted-foreground">
                  ({stats.total_votes.toLocaleString()} votes)
                </span>
              </div>

              <div className="grid gap-4">
                {sortQuestions(stats.top_questions.map(q => ({
                  ...q,
                  topic: topicName,
                  total_votes: q.aye_votes + q.no_votes
                } as Question))).map((question, idx) => (
                  <QuestionCard
                    key={idx}
                    question={question}
                    showDate={sortBy === 'recent'}
                  />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
} 