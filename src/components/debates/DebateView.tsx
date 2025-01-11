'use client';

import { DebateItem } from '@/types';
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Share2, ExternalLink, Search, Clock, UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { getDebateType, locationColors, partyColours } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HansardDebateResponse, HansardContribution } from "@/types/hansard";
import { FormattedMarkdown } from '@/lib/utils';

interface DebateViewProps {
  debate: DebateItem;
  hansardData?: HansardDebateResponse;
}

const constructHansardUrl = (debateExtId: string, title: string, date: string) => {
  const formattedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  return `https://hansard.parliament.uk/House/${date}/debates/${debateExtId}/${formattedTitle}`;
};

function DebateActions({ debate, onShare }: { debate: DebateItem; onShare: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {debate.ext_id && (
        <a
          href={constructHansardUrl(debate.ext_id, debate.title, debate.date)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Hansard</span>
        </a>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
    </div>
  );
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

interface SpeakerPoint {
  speaker: {
    name: string;
    role: string;
    party: string;
    constituency: string;
  };
  contributions: {
    point: string;
    context: string;
    keywords: string[];
  }[];
}

function KeyPointsContent({ keyPoints }: { keyPoints: SpeakerPoint[] }) {
  return (
    <div className="space-y-6">
      {keyPoints.map((item, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="pb-4 bg-muted/5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{item.speaker.name}</h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">{item.speaker.party}</Badge>
                  {item.speaker.constituency && (
                    <Badge variant="outline">{item.speaker.constituency}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.contributions.map((contribution, cIndex) => (
              <div key={cIndex} className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">
                    {contribution.point}
                  </p>
                  <p className="text-sm">
                    {contribution.context}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contribution.keywords.map((keyword, kIndex) => (
                    <Badge 
                      key={kIndex} 
                      variant="secondary"
                      className="text-xs"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DebateView({ debate, hansardData }: DebateViewProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Handle share
  const handleShare = async () => {
    try {
      await navigator.share({
        title: debate.title,
        text: debate.analysis,
        url: window.location.href,
      });
    } catch {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredContributions = useMemo(() => {
    if (!hansardData?.Items) return [];

    const contributions = hansardData.Items.filter(
      (item: HansardContribution) => 
        item.ItemType === "Contribution" && item.AttributedTo
    );

    if (!searchQuery.trim()) return contributions;

    const query = searchQuery.toLowerCase();
    return contributions.filter((contribution: HansardContribution) => {
      const content = stripHtmlTags(contribution.Value).toLowerCase();
      const speaker = contribution.AttributedTo?.toLowerCase() || '';
      return content.includes(query) || speaker.includes(query);
    });
  }, [hansardData?.Items, searchQuery]);

  // Add a new section to render Hansard contributions
  const renderHansardContributions = () => {
    if (!hansardData?.Items) return null;

    return (
      <div className="space-y-6">
        
        {/* Search and Content Card */}
        <Card>
          <CardHeader className="pb-4 sticky top-0 bg-card z-10 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcript..."
                className="pl-9 pr-4 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                inputMode="search"
              />
            </div>
            {searchQuery.trim() && (
              <div className="text-sm text-muted-foreground mt-2 flex items-center justify-between">
                <span>Found {filteredContributions.length} matching contributions</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="h-8 px-2"
                >
                  Clear
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[calc(90vh)] rounded-md border">
              <div className="divide-y divide-border">
                {filteredContributions.map((contribution: HansardContribution) => {
                  if (!contribution.Value || contribution.Value.includes('column-number')) {
                    return null;
                  }

                  const content = stripHtmlTags(contribution.Value);
                  const isQuestion = contribution.HRSTag === 'Question';

                  return (
                    <div 
                      key={contribution.ItemId} 
                      className={cn(
                        "p-4 transition-colors",
                        isQuestion && "bg-muted/30"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {/* Speaker info - Reduce minimum width */}
                        <div className="flex-shrink-0 w-[18%] sm:border-r sm:pr-6">
                          {contribution.AttributedTo && (
                            <div className="flex sm:block items-center justify-between gap-2">
                              <div>
                                <div className="font-medium">
                                  {contribution.AttributedTo.split('(')[0].trim()}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {contribution.AttributedTo
                                    .match(/\((.*?)\)/g)
                                    ?.map((match, index) => {
                                      const label = match.slice(1, -1); // Remove parentheses
                                      return (
                                        <div 
                                          key={index}
                                          className="text-xs inline-block px-2 py-0.5 rounded-full"
                                          style={{
                                            backgroundColor: partyColours[label]?.color || '#808080',
                                            color: '#ffffff'
                                          }}
                                        >
                                          {label}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                              {contribution.Timecode && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(contribution.Timecode), 'HH:mm')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Contribution content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {isQuestion && (
                              <Badge variant="secondary" className="text-xs">
                                Question
                              </Badge>
                            )}
                            {contribution.UIN && (
                              <Badge variant="outline" className="text-xs">
                                UIN: {contribution.UIN}
                              </Badge>
                            )}
                          </div>
                          <HighlightedText 
                            text={formatContributionText(content)}
                            searchTerm={searchQuery}
                            className={cn(
                              "text-sm leading-relaxed text-justify",
                              isQuestion ? "text-foreground" : "text-muted-foreground"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Navigation links */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
          {hansardData.Overview.PreviousDebateTitle && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-sm"
              asChild
            >
              <Link href={`/debate/${hansardData.Overview.PreviousDebateExtId}`}>
                ← {hansardData.Overview.PreviousDebateTitle}
              </Link>
            </Button>
          )}
          {hansardData.Overview.NextDebateTitle && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-sm sm:ml-auto"
              asChild
            >
              <Link href={`/debate/${hansardData.Overview.NextDebateExtId}`}>
                {hansardData.Overview.NextDebateTitle} →
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Add logging to debug hansardData
  useEffect(() => {
    if (!hansardData) {
      console.warn('No hansard data available:', {
        debateId: debate.ext_id,
        date: debate.date
      });
    }
  }, [hansardData, debate.ext_id, debate.date]);

  return (
    <div className="space-y-6">
      <Card 
        className={cn(
          "overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md",
          "flex flex-col"
        )}
        style={{ 
          borderLeftColor: locationColors[debate.house] || '#2b2b2b',
          borderLeftStyle: 'solid',
          backgroundImage: `linear-gradient(to right, ${locationColors[debate.house]}15, transparent 10%)`,
        }}
      >
        {/* Meta Information Header */}
        <div className="px-6 py-4 border-b bg-muted/5 flex-shrink-0">
          <MetaInformation item={debate} />
        </div>

        {/* Title Section */}
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col">
              <CardTitle className="text-xl font-bold">
                {debate.title}
              </CardTitle>
            </div>
            <DebateActions debate={debate} onShare={handleShare} />
          </div>
        </CardHeader>

        {/* Analysis and Key Points Tabs */}
        <Card>
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="w-full justify-start h-auto p-4 bg-transparent space-x-4 border-b">
              <TabsTrigger value="analysis">
                Analysis
              </TabsTrigger>
                <TabsTrigger value="keyPoints">
                  Key Points
                </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="p-4">
              <div className="text-sm text-muted-foreground">
                <FormattedMarkdown content={debate.analysis} />
              </div>
            </TabsContent>

            <TabsContent value="keyPoints" className="p-4">
              <KeyPointsContent 
                keyPoints={debate.speaker_points}
              />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Transcript Section */}
        {hansardData && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Original Transcript</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {renderHansardContributions()}
            </CardContent>
          </Card>
        )}
      </Card>

      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        title="Unlock Full Analysis"
        description="Get instant access to complete debate analyses with an Engaged Citizen subscription."
      />
    </div>
  );
}

// Reuse the MetaInformation component with slight modifications
function MetaInformation({ item }: { item: DebateItem }) {
  const debateType = useMemo(() => getDebateType(item.type), [item.type]);
  
  const formattedDate = useMemo(() => {
    const date = new Date(item.date);
    const isCurrentYear = date.getFullYear() === new Date().getFullYear();
    return format(date, `dd MMM${isCurrentYear ? '' : ' yyyy'}`);
  }, [item.date]);
  
  return (
    <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="hidden sm:inline h-4 w-4" />
          {formattedDate}
        </div>

        {debateType && (
          <Badge 
            variant="secondary"
            className="text-xs font-normal"
          >
            {debateType.label}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function formatContributionText(text: string): string {
    // First clean the text
    const cleanText = stripHtmlTags(text);
    
    // Split into sentences (accounting for common abbreviations)
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    
    // Group sentences into paragraphs
    let currentParagraph = '';
    const paragraphs: string[] = [];
    
    sentences.forEach((sentence) => {
      const potentialParagraph = currentParagraph + sentence;
      
      // If adding this sentence would make the paragraph too long, start a new one
      if (currentParagraph && potentialParagraph.length > 300) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence;
      } else {
        currentParagraph = potentialParagraph;
      }
    });
    
    // Add the last paragraph if there's anything left
    if (currentParagraph) {
      paragraphs.push(currentParagraph.trim());
    }
    
    // Join paragraphs with a special delimiter
    return paragraphs.join('\n\n');
  }