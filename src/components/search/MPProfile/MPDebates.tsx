import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserCircle, Building } from "lucide-react";
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { locationColors, partyColours } from '@/lib/utils';
import createClient from '@/lib/supabase/client';
import { cn } from "@/lib/utils";

interface MPDebate {
  debate_id: string;
  debate_title: string;
  debate_type: string;
  debate_house: string;
  debate_date: string;
  member_name: string;
  member_party: string;
  member_constituency: string;
  member_role: string;
  member_contributions: string[];
}

interface MPDebatesProps {
  memberId: number;
}

function parseContribution(contribution: string): string {
  try {
    const parsed = JSON.parse(contribution);
    return parsed.content || contribution;
  } catch {
    return contribution;
  }
}

export function MPDebates({ memberId }: MPDebatesProps) {
  const [debates, setDebates] = useState<MPDebate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebate, setSelectedDebate] = useState<MPDebate | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDebates() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('search_member_debates', {
            p_member_id: memberId.toString(),
            p_limit: 50,
            p_offset: 0
          });

        if (error) throw error;

        if (data) {
          setDebates(data);
          if (data.length > 0) {
            setSelectedDebate(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching MP debates:', error);
      } finally {
        setLoading(false);
      }
    }

    if (memberId) {
      fetchDebates();
    }
  }, [memberId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!debates.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No recent contributions found
        </CardContent>
      </Card>
    );
  }

  const renderSelectedDebate = () => {
    if (!selectedDebate) return null;

    return (
      <Card className={cn(
        "overflow-hidden relative border-l-[6px] transition-colors h-[calc(100vh-12rem)] overflow-y-auto",
        "sticky top-6"
      )}
      style={{ 
        borderLeftColor: locationColors[selectedDebate.debate_house.toLowerCase()] || '#2b2b2b',
        backgroundImage: `linear-gradient(to right, ${locationColors[selectedDebate.debate_house.toLowerCase()]}15, transparent 10%)`,
      }}>
        <CardHeader className="sticky top-0 bg-card border-b z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(selectedDebate.debate_date), 'dd MMM yyyy')}
            <Badge variant="secondary" className="text-xs">
              {selectedDebate.debate_type}
            </Badge>
          </div>
          <CardTitle className="text-xl">{selectedDebate.debate_title}</CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-32 flex-shrink-0">
                <div className="space-y-1">
                  {selectedDebate.member_role && (
                    <div className="text-sm font-medium">{selectedDebate.member_role}</div>
                  )}
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{
                      backgroundColor: `${partyColours[selectedDebate.member_party]?.color}15` || '#80808015',
                      color: partyColours[selectedDebate.member_party]?.color || '#808080',
                      borderColor: `${partyColours[selectedDebate.member_party]?.color}30` || '#80808030',
                    }}
                  >
                    {selectedDebate.member_party}
                  </Badge>
                </div>
              </div>
              <div className="flex-grow space-y-4">
                {selectedDebate.member_contributions.map((contribution, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg border bg-muted/5"
                  >
                    <p className="text-sm text-muted-foreground">{parseContribution(contribution)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Recent Contributions</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        <div className="space-y-4">
          {debates.map((debate) => (
            <Card 
              key={debate.debate_id}
              className={cn(
                "cursor-pointer overflow-hidden border-l-[6px] transition-colors hover:bg-accent/50",
                selectedDebate?.debate_id === debate.debate_id && "ring-2 ring-primary"
              )}
              style={{ 
                borderLeftColor: locationColors[debate.debate_house.toLowerCase()] || '#2b2b2b',
                backgroundImage: `linear-gradient(to right, ${locationColors[debate.debate_house.toLowerCase()]}08, transparent 15%)`,
              }}
              onClick={() => setSelectedDebate(debate)}
            >
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(debate.debate_date), 'dd MMM yyyy')}
                  <Badge variant="secondary" className="text-xs">
                    {debate.debate_type}
                  </Badge>
                </div>
                <h3 className="font-medium mb-2">{debate.debate_title}</h3>
                {debate.member_contributions.length > 0 && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {parseContribution(debate.member_contributions[0])}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div>
          {renderSelectedDebate()}
        </div>
      </div>
    </div>
  );
}