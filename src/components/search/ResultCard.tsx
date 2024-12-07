import type { KeyPoint } from "@/types";
import type { Contribution, SearchResultAIContent } from "@/types/search";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { CalendarIcon, ExternalLink, Settings2, UserIcon, Users, MessageSquare, LightbulbIcon, ThumbsDown, ThumbsUp } from "lucide-react";
import { locationColors } from '@/lib/utils';
import { motion } from "framer-motion";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { ReactNode, useState, useMemo } from "react";
import { constructHansardUrl } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from 'next/link';
import { PartyDistribution } from "@/components/posts/PartyDistribution";

// Update ResultCard props to include all contributions
export function ResultCard({ 
  result, 
  contributions,
  searchTerm,
  aiContent 
}: { 
  result: Contribution;
  contributions: Contribution[];
  searchTerm?: string;
  getResultTypeIcon: (section: string) => ReactNode;
  aiContent?: SearchResultAIContent;
}) {
  // Update state to track expanded contributions
  const [state, setState] = useState({
    isExpanded: false,
    showTechnicalDetails: false,
    expandedContributions: new Set<string>(), // Track by ContributionExtId
    isFullSummary: false,
    activeSection: 'summary' as 'summary' | 'keyPoints' | 'technical',
    showAllKeyPoints: false,
    showFullContent: false
  });
  
  const formattedDate = useMemo(() => {
    const date = new Date(result.SittingDate);
    const isCurrentYear = date.getFullYear() === new Date().getFullYear();
    return format(date, isCurrentYear ? 'dd MMM' : 'dd MMM yyyy');
  }, [result.SittingDate]);

  // Update the processContributionText function
  const processContributionText = (text: string, searchTerm?: string) => {
    const maxLength = 70;
    
    // If there's no search term or it's not found in the text
    if (!searchTerm || !text.toLowerCase().includes(searchTerm.toLowerCase())) {
      // Simple truncation ensuring we don't cut words
      if (text.length <= maxLength) return text;
      const truncated = text.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      return truncated.substring(0, lastSpace) + '...';
    }

    // Find the search term position (case insensitive)
    const searchTermIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    
    // Calculate the start and end positions for the excerpt
    const halfLength = Math.floor((maxLength - searchTerm.length) / 2);
    let start = Math.max(0, searchTermIndex - halfLength);
    let end = Math.min(text.length, searchTermIndex + searchTerm.length + halfLength);

    // Adjust to not cut words
    if (start > 0) {
      const firstSpace = text.substring(0, start).lastIndexOf(' ');
      if (firstSpace !== -1) {
        start = firstSpace + 1;
      }
    }
    
    if (end < text.length) {
      const lastSpace = text.substring(end).indexOf(' ');
      if (lastSpace !== -1) {
        end += lastSpace;
      }
    }

    // Add ellipsis where needed
    let excerpt = text.substring(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  };

  // Add summary processing
  const processedSummary = useMemo(() => {
    if (!aiContent?.ai_summary) return null;
    const maxLength = 200;
    const fullText = aiContent.ai_summary;
    
    if (fullText.length <= maxLength) return fullText;
    
    return {
      short: fullText.substring(0, maxLength).trim() + '...',
      full: fullText
    };
  }, [aiContent?.ai_summary]);

  // Update keyPointsBySpeaker useMemo to handle null values
  const keyPointsBySpeaker = useMemo(() => {
    if (!aiContent?.ai_key_points) return new Map();
    
    // Filter out null/undefined/invalid key points first
    const validKeyPoints = aiContent.ai_key_points.filter((point): point is KeyPoint => 
      point !== null && 
      typeof point === 'object' &&
      'speaker' in point &&
      point.speaker &&
      typeof point.speaker === 'object' &&
      'name' in point.speaker &&
      typeof point.speaker.name === 'string' &&
      'point' in point &&
      typeof point.point === 'string'
    );
    
    // Move namesMatch function inside useMemo
    const namesMatch = (name1: string, name2: string): boolean => {
      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove special characters
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim();
      };

      const n1 = normalizeName(name1);
      const n2 = normalizeName(name2);

      // Direct match
      if (n1 === n2) return true;

      // Check if one name contains the other
      if (n1.includes(n2) || n2.includes(n1)) return true;

      // Split names into parts and check for partial matches
      const parts1 = n1.split(' ');
      const parts2 = n2.split(' ');

      // Check if last names match
      if (parts1[parts1.length - 1] === parts2[parts2.length - 1]) return true;

      // Check if first names match and are not common titles
      const commonTitles = ['mr', 'mrs', 'ms', 'dr', 'sir', 'lord', 'lady', 'hon'];
      const firstName1 = parts1[0];
      const firstName2 = parts2[0];
      if (firstName1 === firstName2 && !commonTitles.includes(firstName1)) return true;

      return false;
    };

    const map = new Map<string, KeyPoint[]>();
    
    contributions.forEach(contribution => {
      const matchingPoints = validKeyPoints.filter(point => 
        namesMatch(point.speaker.name, contribution.AttributedTo) ||
        (contribution.MemberName && namesMatch(point.speaker.name, contribution.MemberName))
      );
      
      if (matchingPoints && matchingPoints.length > 0) {
        map.set(contribution.AttributedTo, [
          ...(map.get(contribution.AttributedTo) || []),
          ...matchingPoints
        ]);
      }
    });
    
    return map;
  }, [aiContent?.ai_key_points, contributions]);

  // Update remainingKeyPoints to handle null values
  const remainingKeyPoints = useMemo(() => {
    if (!aiContent?.ai_key_points) return [];
    
    // Filter out null/undefined/invalid key points first
    const validKeyPoints = aiContent.ai_key_points.filter((point): point is KeyPoint => 
      point !== null && 
      typeof point === 'object' &&
      'speaker' in point &&
      point.speaker &&
      typeof point.speaker === 'object' &&
      'name' in point.speaker &&
      typeof point.speaker.name === 'string' &&
      'point' in point &&
      typeof point.point === 'string'
    );
    
    const matchedSpeakers = new Set(
      Array.from(keyPointsBySpeaker.values())
        .flat()
        .map(point => point.speaker.name)
    );

    return validKeyPoints.filter(
      point => !matchedSpeakers.has(point.speaker.name)
    );
  }, [aiContent?.ai_key_points, keyPointsBySpeaker]);

  // Add section to render remaining key points
  const renderRemainingKeyPoints = () => {
    if (!state.showAllKeyPoints || !remainingKeyPoints.length) return null;

    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="px-4 py-3 bg-muted/5 border-t"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {remainingKeyPoints.map((point: KeyPoint, index: number) => (
            <div 
              key={index} 
              className="flex flex-col gap-2 p-3 bg-muted/10 rounded-md hover:bg-muted/20 transition-colors"
            >
              {/* Point content */}
              <div className="flex gap-2">
                <LightbulbIcon className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium mb-1">{point.speaker.name}</div>
                  <p className="text-sm text-muted-foreground">{point.point}</p>
                </div>
              </div>

              {/* Support and opposition badges */}
              <div className="flex gap-2 mt-auto pt-2">
                {point.support.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-success/10 text-success hover:bg-success/20"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    {point.support.length}
                  </Badge>
                )}
                {point.opposition.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    {point.opposition.length}
                  </Badge>
                )}
              </div>

              {/* Supporters and opposers */}
              <div className="text-xs space-y-1">
                {point.support.length > 0 && (
                  <div className="text-success/80">
                    Supporting: {point.support.join(', ')}
                  </div>
                )}
                {point.opposition.length > 0 && (
                  <div className="text-destructive/80">
                    Opposing: {point.opposition.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  // Add helper function to toggle contribution expansion
  const toggleContribution = (contributionId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedContributions);
      if (newExpanded.has(contributionId)) {
        newExpanded.delete(contributionId);
      } else {
        newExpanded.add(contributionId);
      }
      return {
        ...prev,
        expandedContributions: newExpanded
      };
    });
  };

  // Simplified contribution rendering
  const renderContribution = (contribution: Contribution) => {
    if (!contribution) return null;

    const contributionKeyPoints = keyPointsBySpeaker.get(contribution.AttributedTo) || [];
    const hasKeyPoints = contributionKeyPoints.length > 0;
    const isExpanded = state.expandedContributions.has(contribution.ContributionExtId);

    // Ensure all key points are valid before rendering
    const validKeyPoints = contributionKeyPoints.filter((point: KeyPoint): point is KeyPoint =>
      point !== null &&
      typeof point === 'object' &&
      'point' in point &&
      'support' in point &&
      'opposition' in point &&
      Array.isArray(point.support) &&
      Array.isArray(point.opposition)
    );

    return (
      <div 
        key={contribution.ContributionExtId} 
        className={cn(
          "px-4 py-3 transition-colors duration-200",
          "hover:bg-muted/10",
          hasKeyPoints && "cursor-pointer",
        )}
        onClick={() => hasKeyPoints && toggleContribution(contribution.ContributionExtId)}
      >
        <div className="space-y-3">
          {/* Header with speaker info and actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {contribution.AttributedTo.split('(')[0].trim()}
                </span>
                {contribution.AttributedTo.includes('(') && (
                  <span className="text-sm text-muted-foreground">
                    ({contribution.AttributedTo.split('(')[1].replace(')', '').trim()})
                  </span>
                )}
              </div>
            </div>
            <a 
              href={constructHansardUrl(contribution, searchTerm)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary/60 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Contribution text */}
          <div className="text-sm text-muted-foreground leading-relaxed">
            <HighlightedText 
              text={processContributionText(contribution.ContributionText, searchTerm)} 
              searchTerm={searchTerm} 
            />
          </div>

          {/* Key points preview */}
          {hasKeyPoints && (
            <div 
              className={cn(
                "flex items-start gap-2 pt-1",
                "border-t border-border/40",
              )}
            >
              <div className={cn(
                "flex items-center gap-2 text-sm",
                "text-primary/60 hover:text-primary",
                "transition-colors duration-200",
                isExpanded && "text-primary"
              )}>
                <LightbulbIcon className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">
                  {isExpanded ? "Collapse key point:" : "View key point"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Expanded key points grid */}
        {isExpanded && hasKeyPoints && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pl-6"
          >
            <div className="space-y-3">
              {validKeyPoints.map((point: KeyPoint, index: number) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-md",
                    "bg-muted/5 hover:bg-muted/10",
                    "transition-colors duration-200"
                  )}
                >
                  {/* Point content */}
                  <p className="text-sm text-muted-foreground">{point.point}</p>

                  {/* Support and opposition */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {point.support.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="gap-1 bg-success/10 text-success hover:bg-success/20"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {point.support.length} Supporting
                      </Badge>
                    )}
                    {point.opposition.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        {point.opposition.length} Opposing
                      </Badge>
                    )}
                  </div>

                  {/* Supporters and opposers details */}
                  <div className="text-xs space-y-1 mt-1">
                    {point.support.length > 0 && (
                      <div className="text-success/80 flex gap-1">
                        <Users className="h-3 w-3" />
                        {point.support.join(', ')}
                      </div>
                    )}
                    {point.opposition.length > 0 && (
                      <div className="text-destructive/80 flex gap-1">
                        <Users className="h-3 w-3" />
                        {point.opposition.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // Update the PostActions component
  function DebateActions({ 
    debate
  }: { 
    debate: Contribution;
    onShare: () => void;
  }) {
    return (
      <Link 
        href={`/debate/${debate.DebateSectionExtId.toUpperCase()}`}
        className="group"
      >
        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors flex items-center gap-1">
          {debate.DebateSection}
          <ArrowUpRight className="h-4 w-4 opacity-50 -translate-y-1 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0" />
        </CardTitle>
      </Link>
    );
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden relative w-full transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.002]",
        "border-l-[6px]"
      )}
      style={{ 
        borderLeftColor: locationColors[aiContent?.location || result.House] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[aiContent?.location || result.House]}08, transparent 15%)`,
      }}
    >
      {/* Top Actions Bar - Updated with all metadata */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {aiContent?.location || result.House}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            {formattedDate}
          </div>
          {aiContent && (
            <Badge 
              variant="default" 
              className="text-xs gap-1 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <LightbulbIcon className="h-3 w-3" />
              AI Enhanced
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Stats */}
          {aiContent && (
            <div className="flex items-center gap-2">
              {aiContent.party_count && (
                <PartyDistribution partyCount={aiContent.party_count} />
              )}
              {aiContent.ai_key_points && aiContent.ai_key_points.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {aiContent.ai_key_points.length}
                </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setState(prevState => ({ ...prevState, showTechnicalDetails: !prevState.showTechnicalDetails }))}
            >
              <Settings2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => window.open(constructHansardUrl(result, searchTerm), '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Title - Updated with link */}
        <DebateActions 
          debate={result} 
          onShare={() => {}} // Add proper share handler if needed
        />

        {/* Summary with Better Typography */}
        {processedSummary && (
          <div className="mt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {typeof processedSummary === 'string' 
                ? processedSummary 
                : (state.isFullSummary ? processedSummary.full : processedSummary.short)}
            </p>
            {typeof processedSummary !== 'string' && (
              <Button
                variant="link"
                size="sm"
                className="text-xs mt-2 h-auto p-0 text-primary hover:text-primary/80"
                onClick={() => setState(prevState => ({ ...prevState, isFullSummary: !prevState.isFullSummary }))}
              >
                {state.isFullSummary ? '← Show Less' : 'Read More →'}
              </Button>
            )}
          </div>
        )}

        {/* Technical Details Drawer */}
        <Collapsible open={state.showTechnicalDetails}>
          <CollapsibleContent className="p-4 border-b bg-muted/5">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Technical Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Debate ID: </span>
                  <code>{result.DebateSectionExtId}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Section: </span>
                  <code>{result.Section}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Order: </span>
                  <code>{result.OrderInDebateSection}</code>
                </div>
                {result.Timecode && (
                  <div>
                    <span className="text-muted-foreground">Timecode: </span>
                    <code>{result.Timecode}</code>
                  </div>
                )}
                {/* Add Contributions List */}
                <div className="col-span-2 mt-2">
                  <span className="text-muted-foreground block mb-1">Contribution IDs:</span>
                  <div className="space-y-1">
                    {contributions.map((contribution) => (
                      <div key={contribution.ContributionExtId} className="flex items-center gap-2">
                        <code className="text-xs">{contribution.ContributionExtId}</code>
                        <a
                          href={constructHansardUrl(contribution, searchTerm)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Contributions Section - Moved to top */}
        <div className="mt-4 border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/5 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contributions</span>
              {remainingKeyPoints.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2",
                    state.showAllKeyPoints ? "text-primary" : "text-primary/60 hover:text-primary"
                  )}
                  onClick={() => setState(prev => ({ ...prev, showAllKeyPoints: !prev.showAllKeyPoints }))}
                >
                  <LightbulbIcon className="h-4 w-4" />
                  All Key Points
                  <Badge variant="secondary">
                    {remainingKeyPoints.length}
                  </Badge>
                </Button>
              )}
            </div>
          </div>

          <div className="divide-y divide-border">
            {contributions.map(renderContribution)}
          </div>

          {/* Render remaining key points in an expandable section */}
          {state.showAllKeyPoints && renderRemainingKeyPoints()}
        </div>
      </div>
    </Card>
  );
}