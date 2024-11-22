import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TOPICS } from "@/lib/utils";

interface QuestionCardProps {
  question: {
    topic: string;
    question: string;
    aye_votes: number;
    no_votes: number;
    total_votes: number;
    created_at?: string;
  };
  showTopic?: boolean;
  showDate?: boolean;
}

export function QuestionCard({ 
  question, 
  showTopic = false, 
  showDate = false 
}: QuestionCardProps) {
  const topicInfo = TOPICS.find(t => t.label === question.topic);
  const Icon = topicInfo?.icon;
  const ayePercentage = (question.aye_votes / question.total_votes) * 100;

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {showTopic && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {Icon && <Icon className="h-4 w-4" />}
            <span>{question.topic}</span>
          </div>
        )}

        <p className="font-medium">{question.question}</p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-emerald-600 font-medium">
              {Number(question.aye_votes).toLocaleString()} ayes
            </span>
            <span className="text-rose-600 font-medium">
              {Number(question.no_votes).toLocaleString()} noes
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {Number(question.total_votes).toLocaleString()} votes
            </span>
            {showDate && question.created_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(question.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <Progress 
          value={ayePercentage} 
          className="h-1.5"
        />
      </div>
    </Card>
  );
} 