import { QuestionCard } from "./QuestionCard";
import type { TopicStats } from "@/types/VoteStats";

interface FlatQuestionListProps {
  topicVoteStats: TopicStats | undefined;
  sortBy: 'votes' | 'recent' | 'agreement';
}

export function FlatQuestionList({ topicVoteStats, sortBy }: FlatQuestionListProps) {
  if (!topicVoteStats) return null;

  const questions = Object.entries(topicVoteStats.topics)
    .flatMap(([topicName, stats]) =>
      (stats.top_questions || []).map(question => ({
        topic: topicName,
        question: question.question,
        aye_votes: question.aye_votes,
        no_votes: question.no_votes,
        total_votes: question.aye_votes + question.no_votes,
        created_at: stats.vote_history?.find(v => v.question === question.question)?.created_at
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
    });

  if (questions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No questions have been voted on yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, idx) => (
        <QuestionCard
          key={idx}
          question={question}
          showTopic={true}
          showDate={sortBy === 'recent'}
        />
      ))}
    </div>
  );
} 