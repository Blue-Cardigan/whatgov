import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { MPKeyPointDetails } from "@/lib/supabase/mpsearch";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getOneOnePortraitUrl } from "@/lib/utils";

interface MPKeyPointsProps {
  keyPoints: MPKeyPointDetails[];
}

export function MPKeyPoints({ keyPoints }: MPKeyPointsProps) {
  const [sortOption, setSortOption] = useState<'recent' | 'supported' | 'opposed'>('recent');
  const [groupByTopic, setGroupByTopic] = useState(false);
  const [expandedDebates, setExpandedDebates] = useState<Set<string>>(new Set());

  // Sort key points based on the selected option
  const sortedKeyPoints = useMemo(() => {
    const pointsCopy = [...keyPoints];
    switch (sortOption) {
      case 'supported':
        return pointsCopy.sort((a, b) => b.support.length - a.support.length);
      case 'opposed':
        return pointsCopy.sort((a, b) => b.opposition.length - a.opposition.length);
      default:
        return pointsCopy.sort((a, b) => new Date(b.debate_date).getTime() - new Date(a.debate_date).getTime());
    }
  }, [keyPoints, sortOption]);

  // Group key points by topic if enabled
  const groupedKeyPoints = useMemo(() => {
    if (!groupByTopic) return { 'All Topics': sortedKeyPoints };

    return sortedKeyPoints.reduce((groups, point) => {
      point.ai_topics.forEach(topic => {
        if (!groups[topic.name]) {
          groups[topic.name] = [];
        }
        groups[topic.name].push(point);
      });
      return groups;
    }, {} as Record<string, MPKeyPointDetails[]>);
  }, [sortedKeyPoints, groupByTopic]);

  const toggleSpeakerPoints = (debateId: string) => {
    setExpandedDebates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(debateId)) {
        newSet.delete(debateId);
      } else {
        newSet.add(debateId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Parliamentary Key Points</h3>
        
        {/* Sort and Group Options */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortOption('recent')}
            className={`px-2 py-1 text-sm rounded ${sortOption === 'recent' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Most Recent
          </button>
          <button
            onClick={() => setSortOption('supported')}
            className={`px-2 py-1 text-sm rounded ${sortOption === 'supported' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Most Supported
          </button>
          <button
            onClick={() => setSortOption('opposed')}
            className={`px-2 py-1 text-sm rounded ${sortOption === 'opposed' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Most Opposed
          </button>
          <button
            onClick={() => setGroupByTopic(!groupByTopic)}
            className={`px-2 py-1 text-sm rounded ${groupByTopic ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            {groupByTopic ? 'Ungroup by Topic' : 'Group by Topic'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedKeyPoints).map(([topic, points]) => (
          <div key={topic} className="space-y-6">
            {groupByTopic && <h4 className="text-sm font-medium text-muted-foreground">{topic}</h4>}
            {points.map((point, index) => (
              <div key={`${point.debate_id}-${index}`} className="relative pl-10">
                {/* Timeline content */}
                <div className="space-y-3 bg-muted/5 rounded-lg p-4 hover:bg-muted/10 transition-colors">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge variant="outline">
                      {format(new Date(point.debate_date), 'EEEE, d MMM yyyy')}
                    </Badge>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {point.support.length} Supporters
                      </Badge>
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                        {point.opposition.length} Opposers
                      </Badge>
                    </div>
                  </div>

                  {/* Main content */}
                  <p className="text-sm">{point.point}</p>

                  {/* Add context if available */}
                  {point.context && (
                    <p className="text-sm text-muted-foreground mt-2">{point.context}</p>
                  )}

                  {/* Debate info */}
                  <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
                    <Link 
                      href={`/debate/${point.debate_ext_id}`}
                      className="group flex items-start gap-1.5 font-medium hover:text-primary transition-colors"
                    >
                      {point.debate_title}
                      <ArrowUpRight className="h-4 w-4 opacity-50 shrink-0 group-hover:opacity-100" />
                    </Link>
                  </div>

                  {/* Topics */}
                  {point.ai_topics && point.ai_topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {point.ai_topics.map((topic, i) => (
                        <Badge 
                          key={`${topic.name}-${i}`}
                          variant="secondary"
                          className="text-xs"
                        >
                          {topic.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {point.all_key_points && point.all_key_points.length > 1 && (
                    <div className="mt-4 space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Other Contributors</span>
                        <button
                          onClick={() => toggleSpeakerPoints(point.debate_id)}
                          className="text-sm text-primary hover:underline"
                        >
                          {expandedDebates.has(point.debate_id) ? "Hide" : "Show"} {point.all_key_points.length - 1} other points
                        </button>
                      </div>
                      
                      {expandedDebates.has(point.debate_id) && (
                        <div className="space-y-4">
                          {point.all_key_points
                            .filter(kp => kp.speaker.memberId !== point.member_id)
                            .map((kp, idx) => (
                              <div key={idx} className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={getOneOnePortraitUrl(parseInt(kp.speaker.memberId))} />
                                  <AvatarFallback>{kp.speaker.name.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Link href={`/member/${kp.speaker.memberId}`} className="text-sm font-medium hover:text-primary">
                                      {kp.speaker.name}
                                    </Link>
                                    <span className="text-xs text-muted-foreground">
                                      {kp.speaker.party} • {kp.speaker.constituency}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{kp.point}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 