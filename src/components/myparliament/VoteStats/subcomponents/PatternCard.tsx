import { ArrowUp, ArrowDown } from 'lucide-react';

interface PatternCardProps {
  title: string;
  topics: Array<{
    topic: string;
    agreement: number;
    total_votes: number;
  }>;
}

export function PatternCard({ title, topics }: PatternCardProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <h4 className="text-sm font-medium mb-3">{title}</h4>
      <div className="space-y-3">
        {topics.slice(0, 3).map((topic) => (
          <div key={topic.topic} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {topic.agreement > 50 ? (
                <ArrowUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDown className="w-4 h-4 text-rose-600" />
              )}
              <span className="text-sm">{topic.topic}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {topic.agreement}% ({topic.total_votes} votes)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 