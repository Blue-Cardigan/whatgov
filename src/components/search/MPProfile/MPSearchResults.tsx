import { Card, CardContent } from "@/components/ui/card";
import { MPLinks } from './MPLinks';
import MPActions from './MPActions';
import { SubscriptionCTA } from '@/components/ui/subscription-cta';
import { useState } from 'react';
import { Clock, Search, ChevronDown, User, Calendar, Building, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { locationColors, partyColours } from '@/lib/utils';
import { cn } from "@/lib/utils";
import createClient from '@/lib/supabase/client';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import NextLink from 'next/link';
import type { MPDebate, ProfileDetailProps, MPSearchResultsProps } from '@/types/search';
import Image from 'next/image';

function ProfileDetail({ icon, label, value }: ProfileDetailProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 sm:items-center">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="font-medium text-muted-foreground">{label}:</span>
      </div>
      <span className="ml-6 sm:ml-0">{value}</span>
    </div>
  );
}

function parseContribution(contribution: string): string {
  try {
    const parsed = JSON.parse(contribution);
    return parsed.content || contribution;
  } catch {
    return contribution;
  }
}

function MinisterialBadge({ rank }: { rank: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 cursor-help touch-action-none`}
            role="button"
            tabIndex={0}
          >
            {rank}
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center"
          sideOffset={5}
          className="max-w-[280px] text-sm text-center"
        >
          <p>Your MP is in the Cabinet. This is their place in the &quot;pecking order&quot;</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MPSearchResults({ results, isProfessional, searchTerm }: MPSearchResultsProps) {
  const [selectedMPId, setSelectedMPId] = useState<number | null>(null);
  const [debates, setDebates] = useState<MPDebate[]>([]);
  const [loadingDebates, setLoadingDebates] = useState(false);
  const supabase = createClient();

  const fetchDebates = async (memberId: number) => {
    try {
      setLoadingDebates(true);
      const { data, error } = await supabase
        .rpc('search_member_debates', {
          p_member_id: memberId.toString(),
          p_limit: 50,
          p_offset: 0
        });

      if (error) throw error;
      if (data) {
        setDebates(data);
      }
    } catch (error) {
      console.error('Error fetching MP debates:', error);
    } finally {
      setLoadingDebates(false);
    }
  };

  const handleSelectMP = (mpId: number) => {
    setSelectedMPId(mpId);
    if (isProfessional) {
      fetchDebates(mpId);
    }
  };

  if (!results?.length) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Search className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <CardContent className="space-y-2">
            <h3 className="font-semibold text-lg">No Results Found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 
                `No MPs found matching "${searchTerm}"` :
                "Enter an MP's name to begin searching"
              }
            </p>
          </CardContent>
        </div>
      </Card>
    );
  }

  const selectedMP = results.find(mp => mp.member_id === selectedMPId);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-6">
      {/* Left column - MP List and Details */}
      <ScrollArea className="h-[calc(65vh)]">
        <div className="space-y-4 pr-2">
          <h2 className="font-semibold text-lg">
            Found {results.length} MPs
          </h2>
          
          {results.map((mp) => (
            <Card 
              key={mp.member_id}
              className={cn(
                "transition-all duration-200 max-w-[350px] ml-1",
                selectedMPId === mp.member_id 
                  ? 'ring-2 ring-primary shadow-md' 
                  : 'hover:bg-accent/50 hover:shadow-sm cursor-pointer'
              )}
              onClick={() => selectedMPId !== mp.member_id && handleSelectMP(mp.member_id)}
            >
              <CardContent className={cn(
                "p-3",
                selectedMPId === mp.member_id && "pb-4"
              )}>
                {/* MP Basic Info */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    {mp.member_id && (
                      <div className={cn(
                        "relative",
                        selectedMPId === mp.member_id 
                          ? "w-16 h-16" 
                          : "w-10 h-10"
                      )}>
                        <Image 
                          src={`https://members-api.parliament.uk/api/Members/${mp.member_id}/Portrait?cropType=OneOne`}
                          alt={mp.display_as}
                          fill
                          className={cn(
                            "object-cover ring-1 ring-black/5 transition-all duration-200",
                            selectedMPId === mp.member_id 
                              ? "rounded-lg" 
                              : "rounded-full"
                          )}
                          sizes={selectedMPId === mp.member_id ? "64px" : "40px"}
                          priority={selectedMPId === mp.member_id}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium truncate text-sm">{mp.display_as}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className="text-xs shrink-0"
                        style={{
                          backgroundColor: `${partyColours[mp.party]?.color}15` || '#80808015',
                          color: partyColours[mp.party]?.color || '#808080',
                        }}
                      >
                        {mp.party}
                      </Badge>
                    </div>
                  </div>
                </div>
          
                {/* Expanded Profile */}
                {selectedMPId === mp.member_id && (
                  <div className="mt-4 space-y-4 animate-in fade-in-50 duration-200">
                    <div className="space-y-3">
                      {/* Title and Role */}
                      <div className="space-y-2">
                        {mp.full_title && (
                          <p className="text-xs text-muted-foreground">{mp.full_title}</p>
                        )}
                        {mp.ministerial_ranking && (
                          <div className="flex items-center gap-2">
                            <MinisterialBadge rank={mp.ministerial_ranking.toString()} />
                          </div>
                        )}
                      </div>
          
                      {/* Department */}
                      {mp.department && (
                        <div className="text-xs flex items-center gap-2 text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span>{mp.department}</span>
                        </div>
                      )}
          
                      {/* Details Grid */}
                      <div className="grid gap-2 pt-2 border-t">
                        <ProfileDetail
                          icon={<MapPin className="h-3 w-3" />}
                          label="Constituency"
                          value={
                            <span className="text-sm break-words">
                              {mp.constituency}
                              {mp.constituency_country && 
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({mp.constituency_country})
                                </span>
                              }
                            </span>
                          }
                        />
                        
                        <ProfileDetail
                          icon={<Calendar className="h-3 w-3" />}
                          label="Member since"
                          value={
                            <span className="text-sm">
                              {format(new Date(mp.house_start_date), 'dd MMM yyyy')}
                            </span>
                          }
                        />
          
                        {mp.age && (
                          <ProfileDetail
                            icon={<User className="h-3 w-3" />}
                            label="Age"
                            value={<span className="text-sm">{mp.age}</span>}
                          />
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <MPActions mp={mp} debates={debates} />
                    </div>
          
                    {/* Links Section */}
                    <div className="pt-3 border-t">
                      <MPLinks mpData={mp} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Right column - Contributions */}
      <ScrollArea className="h-[calc(65vh)]">
        <div className="space-y-4 lg:pl-1">
          {selectedMP ? (
            <>
              <h2 className="font-semibold text-lg">Recent Contributions</h2>
              
              {isProfessional ? (
                loadingDebates ? (
                  <Card className="p-6">
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 bg-muted-foreground/10 rounded w-1/3" />
                          <div className="h-4 bg-muted-foreground/10 rounded w-full" />
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : debates.length > 0 ? (
                  <div className="space-y-3">
                    {debates.map((debate) => (
                      <Collapsible key={debate.debate_id}>
                        <Card className={cn(
                          "overflow-hidden border-l-[6px]",
                        )}
                        style={{ 
                          borderLeftColor: locationColors[debate.debate_house.toLowerCase()] || '#2b2b2b',
                          backgroundImage: `linear-gradient(to right, ${locationColors[debate.debate_house.toLowerCase()]}08, transparent 15%)`,
                        }}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between p-4 h-auto font-normal hover:bg-accent/50"
                            >
                              <div className="flex-1 text-left space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {format(new Date(debate.debate_date), 'dd MMM yyyy')}
                                  <Badge variant="secondary" className="text-xs">
                                    {debate.debate_type}
                                  </Badge>
                                  <NextLink 
                                    href={`/debate/${debate.debate_id}`} 
                                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      window.location.href = `/debate/${debate.debate_id}`;
                                    }}
                                    className="text-primary hover:underline whitespace-nowrap text-xs inline-flex items-center gap-1"
                                  >
                                      View in debate →
                                  </NextLink>
                                </div>
                                <h3 className="font-medium">{debate.debate_title}</h3>
                              </div>
                              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-3">
                              {debate.member_contributions.map((contribution, index) => (
                                <div 
                                  key={index}
                                  className="p-3 rounded-lg border bg-muted/5"
                                >
                                  <p className="text-sm text-muted-foreground">{parseContribution(contribution)}</p>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center text-muted-foreground">
                    No recent contributions found
                  </Card>
                )
              ) : (
                <SubscriptionCTA
                  title="Upgrade to track MP activity"
                  description="Get detailed insights into MPs' parliamentary contributions and positions."
                  features={[
                    "View key points for any MP",
                    "Track MP activities and votes",
                    "Compare MPs' positions on issues"
                  ]}
                />
              )}
            </>
          ) : (
            <Card className="h-[400px] flex items-center justify-center text-center">
              <CardContent>
                <p className="text-muted-foreground">
                  Select an MP to view their recent contributions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}