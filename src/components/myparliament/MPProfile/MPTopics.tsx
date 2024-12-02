import { Card } from "@/components/ui/card";
import type { AiTopic } from "@/types";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TOPICS } from "@/lib/utils";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Helper function for date formatting
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

interface MPTopicsProps {
  topics: AiTopic[];
  totalMentions?: number;
}

const calculateTrend = (debates: { date: string }[]) => {
  if (debates.length < 2) return 'neutral';
  
  // Sort debates by date (newest first)
  const sortedDates = debates
    .map(d => new Date(d.date).getTime())
    .sort((a, b) => b - a);

  // Split into two periods: recent and older
  const midPoint = Math.floor(sortedDates.length / 2);
  const recentPeriod = sortedDates.slice(0, midPoint);
  const olderPeriod = sortedDates.slice(midPoint);

  // Calculate frequency per day for each period
  const recentFrequency = recentPeriod.length / 
    (Math.max(1, (recentPeriod[0] - recentPeriod[recentPeriod.length - 1]) / (1000 * 60 * 60 * 24)));
  const olderFrequency = olderPeriod.length / 
    (Math.max(1, (olderPeriod[0] - olderPeriod[olderPeriod.length - 1]) / (1000 * 60 * 60 * 24)));

  // Compare frequencies
  const difference = recentFrequency - olderFrequency;
  if (difference > 0.1) return 'up';
  if (difference < -0.1) return 'down';
  return 'neutral';
};

// Helper function to get unique subtopics from a single debate
const getUniqueSubtopics = (debate: { subtopics?: string[] }) => {
  return Array.from(new Set(debate.subtopics || []));
};

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
          
          const trend = calculateTrend(topic.debates || []);
          const getTrendIcon = (trend: string) => {
            switch (trend) {
              case 'up':
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Increasing activity in recent debates</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              case 'down':
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Decreasing activity in recent debates</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              default:
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Steady activity level</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
            }
          };

          // Sort debates by date (most recent first)
          const sortedDebates = [...(topic.debates || [])].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          const latestDebate = sortedDebates[0];
          const historicDebates = sortedDebates.slice(1);

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
                  {getTrendIcon(trend)}
                  <Badge variant="secondary">
                    {topic.frequency} {topic.frequency === 1 ? 'key point' : 'key points'}
                  </Badge>
                </div>
              </div>

              {/* Activity Bar */}
              <div className="space-y-1">
                <Progress value={percentageOfTotal} className="h-1.5" />
              </div>

              {/* Debates List */}
              <div className="space-y-2">
                {latestDebate && (
                  <Link 
                    href={`/debate/${latestDebate.ext_id}`}
                    className="block group"
                  >
                    <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-start gap-1.5">
                      <span className="flex-1">
                        <span className="font-medium">Latest:</span> {latestDebate.title}
                      </span>
                      <ArrowUpRight className="h-4 w-4 opacity-50 shrink-0 -translate-y-0.5 translate-x-0.5 transition-transform group-hover:translate-y-0 group-hover:translate-x-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(latestDebate.date)}
                      </div>
                      {getUniqueSubtopics(latestDebate).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {getUniqueSubtopics(latestDebate).map((subtopic, i) => (
                            <Badge 
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {subtopic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )}

                {historicDebates.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <ChevronDown className="h-3 w-3" />
                      {historicDebates.length} more mentions
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      {historicDebates.map((debate, i) => (
                        <Link 
                          key={i}
                          href={`/debate/${debate.ext_id}`}
                          className="block group"
                        >
                          <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-start gap-1.5">
                            <span className="flex-1">
                              {debate.title}
                            </span>
                            <ArrowUpRight className="h-4 w-4 opacity-50 shrink-0 -translate-y-0.5 translate-x-0.5 transition-transform group-hover:translate-y-0 group-hover:translate-x-0" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(debate.date)}
                            </div>
                            {getUniqueSubtopics(debate).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {getUniqueSubtopics(debate).map((subtopic, i) => (
                                  <Badge 
                                    key={i}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {subtopic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 