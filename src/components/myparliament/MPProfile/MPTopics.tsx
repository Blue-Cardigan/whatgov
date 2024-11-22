import { Card } from "@/components/ui/card";
import type { AiTopic } from "@/types";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TOPICS } from "@/lib/utils";

interface MPTopicsProps {
  topics: AiTopic[];
  totalMentions?: number;
}

export function MPTopics({ topics, totalMentions }: MPTopicsProps) {
  const total = totalMentions || topics.reduce((sum, topic) => sum + topic.frequency, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Topic Focus Areas</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="font-normal">
                {total} total key points
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Based on recent parliamentary activity</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((topic, index) => {
          const percentageOfTotal = (topic.frequency / total) * 100;
          const topicInfo = TOPICS.find(t => t.label === topic.name);
          const Icon = topicInfo?.icon;
          
          // Calculate trend (this would be better with historical data)
          const getTrendIcon = (frequency: number) => {
            if (frequency > 5) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
            if (frequency < 2) return <TrendingDown className="h-4 w-4 text-rose-500" />;
            return <Minus className="h-4 w-4 text-muted-foreground" />;
          };

          return (
            <Card key={index} className="p-4 space-y-4">
              {/* Topic Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <h4 className="font-medium">{topic.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(percentageOfTotal)}% of key points
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(topic.frequency)}
                  <Badge variant="secondary">
                    {topic.frequency} {topic.frequency === 1 ? 'key point' : 'key points'}
                  </Badge>
                </div>
              </div>

              {/* Activity Bar */}
              <div className="space-y-1">
                <Progress value={percentageOfTotal} className="h-1.5" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 