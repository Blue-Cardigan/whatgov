'use client';

import { FeedItem, PartyCount } from '@/types';
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, Share2, ExternalLink, Search, Clock, Building, LockIcon, LightbulbIcon, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { getDebateType, locationColors, partyColours } from '@/lib/utils';
import { DebateContent, AnalysisPreview } from '../posts/DebateContent';
import { DivisionContent } from '../posts/DivisionContent';
import { CommentsContent } from '../posts/CommentsContent';
import { KeyPointsContent } from '../posts/KeyPointsContent';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";
import { PartyDistribution } from '../posts/PartyDistribution';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HansardDebateResponse, HansardContribution, HansardNavigatorItem } from "@/types/hansard";

interface DebateViewProps {
  debate: FeedItem;
  userMp?: string | null;
  hansardData?: HansardDebateResponse;
}

const constructHansardUrl = (debateExtId: string, title: string, date: string) => {
  const formattedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  return `https://hansard.parliament.uk/House/${date}/debates/${debateExtId}/${formattedTitle}`;
};

function DebateActions({ debate, onShare }: { debate: FeedItem; onShare: () => void }) {
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

export function DebateView({ debate, userMp, hansardData }: DebateViewProps) {
  const { user, isEngagedCitizen } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [currentDivisionIndex, setCurrentDivisionIndex] = useState(0);
  const hasDivisions = debate.divisions && debate.divisions.length > 0;

  // Only show key points tab if user has appropriate subscription
  const showKeyPointsTab = useMemo(() => {
    return debate.ai_key_points?.length > 0 && (user && isEngagedCitizen);
  }, [debate.ai_key_points, user, isEngagedCitizen]);

  // Handle share
  const handleShare = async () => {
    try {
      await navigator.share({
        title: debate.ai_title,
        text: debate.ai_summary,
        url: window.location.href,
      });
    } catch {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  // Memoize computed values
  const isUserMpSpeaker = useMemo(() => 
    userMp && debate.speakers?.[0]?.display_as === userMp,
    [userMp, debate.speakers]
  );

  const activeTabDefault = useMemo(() => 
    hasDivisions ? "divisions" : "comments",
    [hasDivisions]
  );

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
        {/* Overview Card */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span>{hansardData.Overview.House} • {hansardData.Overview.Location}</span>
              </div>
              <CardTitle>{hansardData.Overview.Title}</CardTitle>
            </div>
            
            {/* Navigation breadcrumb */}
            <div className="text-sm text-muted-foreground flex gap-2 items-center flex-wrap">
              {hansardData.Navigator?.map((nav: HansardNavigatorItem, index: number) => (
                <span key={nav.Id} className="flex items-center">
                  {nav.Title}
                  {index < hansardData.Navigator.length - 1 && (
                    <span className="mx-2 text-muted-foreground/50">→</span>
                  )}
                </span>
              ))}
            </div>
          </CardHeader>
        </Card>

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
            <ScrollArea className="h-[calc(100vh-300px)] rounded-md border">
              <div className="divide-y divide-border">
                {filteredContributions.map((contribution: HansardContribution) => {
                  if (!contribution.Value || contribution.Value.includes('column-number')) {
                    return null;
                  }

                  const content = stripHtmlTags(contribution.Value);
                  const isQuestion = contribution.HRSTag === 'Question';
                  const party = contribution.AttributedTo?.match(/\((.*?)\)/)?.[1];

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
                        <div className="flex-shrink-0 sm:min-w-[8%] sm:max-w-[30%] sm:border-r sm:pr-6">
                          {contribution.AttributedTo && (
                            <div className="flex sm:block items-center justify-between gap-2">
                              <div>
                                <div className="font-medium">
                                  {contribution.AttributedTo.split('(')[0].trim()}
                                </div>
                                {party && (
                                  <div 
                                    className="text-xs inline-block px-2 py-0.5 rounded-full mt-1"
                                    style={{
                                      backgroundColor: partyColours[party]?.color || '#808080',
                                      color: '#ffffff'
                                    }}
                                  >
                                    {party}
                                  </div>
                                )}
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
          "flex flex-col",
          isUserMpSpeaker ? "ring-1 ring-primary/20" : ""
        )}
        style={{ 
          borderLeftColor: locationColors[debate.location] || '#2b2b2b',
          borderLeftStyle: 'solid',
          backgroundImage: `linear-gradient(to right, ${locationColors[debate.location]}15, transparent 10%)`,
        }}
      >
        {/* Meta Information Header */}
        <div className="px-6 py-4 border-b bg-muted/5 flex-shrink-0">
          <MetaInformation item={debate} />
        </div>

        {/* Title Section */}
        <CardHeader className={cn(
          "pb-2 flex-shrink-0",
          isUserMpSpeaker ? "pt-8 sm:pt-10" : "pt-4"
        )}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col">
              <CardTitle className="text-xl font-bold">
                {debate.ai_title}
              </CardTitle>
              {userMp && debate.speakers?.[0]?.display_as === userMp && (
                <span className="sm:hidden flex items-center gap-1.5 text-primary text-sm mt-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  Your MP spoke
                </span>
              )}
            </div>
            <DebateActions debate={debate} onShare={handleShare} />
          </div>
        </CardHeader>

        {/* Overview Section */}
        <div className="px-6 pb-4">
          <h3 className="text-lg font-semibold mb-4">Overview</h3>
          <div className="text-sm text-muted-foreground leading-relaxed text-justify">
            <p>{debate.ai_overview}</p>
          </div>
        </div>

        {/* Analysis Section - Modified */}
        {debate.ai_summary && debate.ai_summary !== debate.ai_overview && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Analysis</h3>
              </div>
              {isEngagedCitizen && (
                <Badge variant="secondary" className="gap-1.5">
                  <LightbulbIcon className="h-4 w-4" />
                  Premium
                </Badge>
              )}
            </div>
            
            {isEngagedCitizen ? (
              <div className="text-sm text-muted-foreground leading-relaxed text-justify">
                <p>{debate.ai_summary}</p>
              </div>
            ) : (
              <AnalysisPreview onUpgrade={() => setShowUpgradeDialog(true)} variant="full" />
            )}
          </div>
        )}
      </Card>

      {/* Tabs Section for Divisions, Comments, etc. */}
      <div className="border-t">
        <Tabs defaultValue={hasDivisions ? "divisions" : "comments"} className="w-full">
          <div className="px-6 py-3 border-b">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent space-x-4">
              {hasDivisions && (
                <TabsTrigger 
                  value="divisions"
                  className="data-[state=active]:bg-primary/10"
                >
                  Divisions
                </TabsTrigger>
              )}
              {debate.ai_comment_thread?.length > 0 && (
                <TabsTrigger 
                  value="comments"
                  className="data-[state=active]:bg-primary/10"
                >
                  Hot Takes
                </TabsTrigger>
              )}
              {showKeyPointsTab && (
                <TabsTrigger 
                  value="keyPoints"
                  className="data-[state=active]:bg-primary/10"
                >
                  Key Points
                </TabsTrigger>
              )}
              {hansardData && (
                <TabsTrigger value="hansard">
                  Original Transcript
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {hasDivisions && (
              <TabsContent value="divisions" className="mt-6">
                <div className="bg-card rounded-lg border">
                  <DivisionContent 
                    divisions={debate.divisions!}
                    currentIndex={currentDivisionIndex}
                    onNavigate={setCurrentDivisionIndex}
                    isActive={true}
                  />
                </div>
              </TabsContent>
            )}

            {debate.ai_comment_thread?.length > 0 && (
              <TabsContent value="comments" className="mt-6">
                <div className="bg-card rounded-lg border">
                  <CommentsContent 
                    comments={debate.ai_comment_thread}
                    isActive={true}
                  />
                </div>
              </TabsContent>
            )}

            {showKeyPointsTab && (
              <TabsContent value="keyPoints" className="mt-6">
                <div className="bg-card rounded-lg border">
                  <KeyPointsContent 
                    keyPoints={debate.ai_key_points}
                    isActive={true}
                    userMp={userMp}
                  />
                </div>
              </TabsContent>
            )}

            {hansardData && (
              <TabsContent value="hansard">
                <div className="bg-card rounded-lg border">
                  {renderHansardContributions()}
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

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
function MetaInformation({ item }: { item: FeedItem }) {
  const partyCount = item.party_count as PartyCount;
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

      <PartyDistribution partyCount={partyCount} />
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