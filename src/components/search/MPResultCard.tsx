import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarIcon, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { MPKeyPointDetails } from "@/lib/supabase/myparliament";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo, useState } from "react";
import { KeyPoint } from "@/types";

interface MPResultCardProps {
  result: MPKeyPointDetails;
  searchTerm?: string;
  allDebatePoints?: MPKeyPointDetails[];
}

interface SpeakerPoints {
  speaker: {
    id: string;
    name: string;
    party: string;
    constituency: string;
    imageUrl?: string;
  };
  points: KeyPoint[];
}

const getPortraitUrl = (memberId: number) => 
  `https://members-api.parliament.uk/api/Members/${memberId}/Portrait?croptype=oneone&webversion=true`;

export function MPResultCard({ result, searchTerm, allDebatePoints }: MPResultCardProps) {
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set());

  const toggleSpeakerPoints = (speakerId: string) => {
    setExpandedSpeakers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(speakerId)) {
        newSet.delete(speakerId);
      } else {
        newSet.add(speakerId);
      }
      return newSet;
    });
  };

  const formattedDate = format(new Date(result.debate_date), 'dd MMM yyyy');
  
  // Group points by speaker from all_key_points
  const pointsBySpeaker = useMemo(() => {
    return result.all_key_points.reduce((acc, point) => {
      const memberId = point.speaker.memberId;
      
      if (!acc[memberId]) {
        acc[memberId] = {
          speaker: {
            id: memberId,
            name: point.speaker.name,
            party: point.speaker.party,
            constituency: point.speaker.constituency,
            imageUrl: point.speaker.imageUrl,
          },
          points: []
        };
      }
      acc[memberId].points.push(point as KeyPoint);
      return acc;
    }, {} as Record<string, SpeakerPoints>);
  }, [result.all_key_points]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Debate Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-1">
            <Link 
              href={`/debate/${result.debate_ext_id}`}
              className="hover:text-primary transition-colors"
            >
              <CardTitle className="text-xl">{result.debate_title}</CardTitle>
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{formattedDate}</span>
              <Badge variant="secondary" className="ml-2">
                {result.debate_type}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Speaker's Points */}
        <div className="space-y-6">
          {/* Searched MP's points first */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getPortraitUrl(parseInt(result.member_id))} />
                <AvatarFallback>{result.speaker_name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/member/${result.member_id}`} className="font-medium hover:text-primary">
                  {result.speaker_name}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {result.speaker_party} • {result.speaker_constituency}
                </div>
              </div>
            </div>
            <div className="pl-13 space-y-4">
              {pointsBySpeaker[result.member_id].points.map((point: KeyPoint, index: number) => (
                <div 
                  key={index}
                  className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/20"
                >
                  <p className="text-sm leading-relaxed">{point.point}</p>
                  {point.context && (
                    <p className="text-sm text-muted-foreground mt-2">{point.context}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {Array.isArray(point.support) && point.support.length > 0 && (
                      <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                        <ThumbsUp className="h-3 w-3" />
                        {point.support.length}
                      </Badge>
                    )}
                    {Array.isArray(point.opposition) && point.opposition.length > 0 && (
                      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive">
                        <ThumbsDown className="h-3 w-3" />
                        {point.opposition.length}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Speakers' Points as Dropdowns */}
          {Object.entries(pointsBySpeaker)
            .filter(([id]) => id !== result.member_id)
            .map(([id, { speaker, points }]) => (
              <div key={id} className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getPortraitUrl(parseInt(speaker.id))} />
                    <AvatarFallback>{speaker.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/member/${id}`} className="font-medium hover:text-primary">
                      {speaker.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {speaker.party} • {speaker.constituency}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSpeakerPoints(id)}
                    className="ml-auto text-sm text-primary hover:underline"
                  >
                    {expandedSpeakers.has(id) ? "Hide Points" : "Show Points"}
                  </button>
                </div>
                {expandedSpeakers.has(id) && (
                  <div className="pl-11 space-y-4">
                    {points.map((point, index) => (
                      <div 
                        key={index}
                        className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-muted"
                      >
                        <p className="text-sm leading-relaxed text-muted-foreground">{point.point}</p>
                        <div className="flex gap-2 mt-2">
                          {Array.isArray(point.support) && point.support.length > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {point.support.length}
                            </Badge>
                          )}
                          {Array.isArray(point.opposition) && point.opposition.length > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <ThumbsDown className="h-3 w-3" />
                              {point.opposition.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>{result.all_key_points.length} contributions</span>
          </div>
          <Link 
            href={`/debate/${result.debate_ext_id}`}
            className="hover:text-primary transition-colors"
          >
            View full debate →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
} 