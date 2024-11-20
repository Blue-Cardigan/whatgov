import { Card } from "@/components/ui/card";
import type { AiTopic } from "@/types";
import { Badge } from "@/components/ui/badge";

interface MPTopicsProps {
  topics: AiTopic[];
}

export function MPTopics({ topics }: MPTopicsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Topics</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((topic, index) => (
          <Card key={index} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h4 className="font-medium">{topic.name}</h4>
              <Badge variant="secondary">
                {topic.frequency} {topic.frequency === 1 ? 'mention' : 'mentions'}
              </Badge>
            </div>
            
            {topic.speakers.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Key speakers:</p>
                <div className="text-sm">
                  {topic.speakers.slice(0, 2).join(', ')}
                  {topic.speakers.length > 2 && ' and others'}
                </div>
              </div>
            )}

            {topic.subtopics.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Related topics:</p>
                <div className="flex flex-wrap gap-2">
                  {topic.subtopics.slice(0, 5).map((subtopic, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-muted px-2 py-1 rounded-full"
                    >
                      {subtopic}
                    </span>
                  ))}
                  {topic.subtopics.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{topic.subtopics.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 