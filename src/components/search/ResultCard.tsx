import { Contribution } from "@/types/search";
import { KeyPoint, SearchResultAIContent } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, ExternalLink, Settings2, UserIcon, Users, MessageSquare, LightbulbIcon, ThumbsDown, ThumbsUp, ChevronDown } from "lucide-react";
import { locationColors, getDebateType } from '@/lib/utils';
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { ReactNode, useState, useMemo } from "react";
import { constructHansardUrl } from "@/lib/utils";
import { useEngagement } from '@/hooks/useEngagement';

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

  const debateType = useMemo(() => getDebateType(result.Section), [result.Section]);

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

  // Helper function to normalize names for comparison
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  };

  // Helper function to check if names match
  const namesMatch = (name1: string, name2: string): boolean => {
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

  // Create a map of key points by speaker with fuzzy matching
  const keyPointsBySpeaker = useMemo(() => {
    if (!aiContent?.ai_key_points) return new Map();
    
    const map = new Map<string, typeof aiContent.ai_key_points>();
    
    contributions.forEach(contribution => {
      const matchingPoints = aiContent?.ai_key_points?.filter(point => 
        namesMatch(point.speaker, contribution.AttributedTo) ||
        (contribution.MemberName && namesMatch(point.speaker, contribution.MemberName))
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

  // Get remaining key points (those without matching speakers)
  const remainingKeyPoints = useMemo(() => {
    if (!aiContent?.ai_key_points) return [];
    
    const matchedSpeakers = new Set(
      Array.from(keyPointsBySpeaker.values())
        .flat()
        .map(point => point.speaker)
    );

    return aiContent.ai_key_points.filter(
      point => !matchedSpeakers.has(point.speaker)
    );
  }, [aiContent?.ai_key_points, keyPointsBySpeaker]);

  // Add button to view all key points
  const renderAllKeyPointsButton = () => {
    if (!remainingKeyPoints.length) return null;

    return (
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
        <Badge variant="secondary" className="ml-1">
          {remainingKeyPoints.length}
        </Badge>
      </Button>
    );
  };

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
                  <div className="text-sm font-medium mb-1">{point.speaker}</div>
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
    const contributionKeyPoints = keyPointsBySpeaker.get(contribution.AttributedTo) || [];
    const hasKeyPoints = contributionKeyPoints.length > 0;
    const isExpanded = state.expandedContributions.has(contribution.ContributionExtId);

    return (
      <div key={contribution.ContributionExtId} className="px-4 py-3 bg-muted/5">
        {/* Main content row */}
        <div className="flex gap-4">
          {/* Speaker info */}
          <div className="flex-shrink-0 min-w-[25%] max-w-[50%] pr-3 border-r text-right">
            <div className="text-sm font-medium">
              {contribution.AttributedTo.split('(')[0].trim()}
            </div>
            {contribution.AttributedTo.includes('(') && (
              <div className="text-xs text-muted-foreground">
                ({contribution.AttributedTo.split('(')[1].replace(')', '').trim()})
              </div>
            )}
          </div>

          {/* Contribution text with lightbulb */}
          <div className="flex-1">
            <div className="flex gap-3 group">
              {hasKeyPoints && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 rounded-full",
                    isExpanded ? "text-primary" : "text-primary/60 hover:text-primary",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleContribution(contribution.ContributionExtId);
                  }}
                >
                  <LightbulbIcon className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 text-sm text-muted-foreground">
                <HighlightedText 
                  text={processContributionText(contribution.ContributionText, searchTerm)} 
                  searchTerm={searchTerm} 
                />
                <a href={constructHansardUrl(contribution, searchTerm)} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 ml-2 text-xs text-primary opacity-0 group-hover:opacity-100">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Key points grid - shown below when this specific contribution is expanded */}
        {isExpanded && hasKeyPoints && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contributionKeyPoints.map((point: KeyPoint, index: number) => (
                <div 
                  key={index} 
                  className="flex flex-col gap-2 p-3 bg-muted/10 rounded-md hover:bg-muted/20 transition-colors"
                >
                  {/* Point content */}
                  <div className="flex gap-2">
                    <LightbulbIcon className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{point.point}</p>
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
        )}
      </div>
    );
  };

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
      {/* Top Actions Bar - Updated Badge */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/5">
        <Badge variant="outline" className="text-xs">
          {aiContent?.location || result.House}
        </Badge>
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

      {/* Main Content - Responsive Spacing */}
      <div className="p-4 sm:p-6">
        {/* Date and Type Row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {formattedDate}
          </div>
          {debateType && (
            <Badge variant="secondary" className="text-xs font-normal">
              {debateType.label}
            </Badge>
          )}
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
        
        {/* Title - More Prominent */}
        <h3 className="text-lg font-semibold mb-3 truncate">
          {aiContent?.ai_title || result.DebateSection}
        </h3>

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

        {/* Stats Row - Responsive Layout */}
        {aiContent && (
          <div className="flex flex-wrap gap-4 mt-4 p-3 bg-muted/5 rounded-md">
            {aiContent.speaker_count && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <UserIcon className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">{aiContent.speaker_count} speakers</span>
              </div>
            )}
            {aiContent.party_count && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-secondary/10 rounded-full">
                  <Users className="h-3 w-3 text-secondary" />
                </div>
                <span className="text-sm">{Object.keys(aiContent.party_count).length} parties</span>
              </div>
            )}
            {aiContent.ai_key_points && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-tertiary/10 rounded-full">
                  <MessageSquare className="h-3 w-3 text-tertiary" />
                </div>
                <span className="text-sm">{aiContent.ai_key_points.length} key points</span>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Contributions list */}
      <div className="divide-y divide-border">
        {contributions.map(renderContribution)}
      </div>

            {/* All Key Points button */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        {renderAllKeyPointsButton()}
      </div>

      {/* Render remaining key points at the bottom */}
      {renderRemainingKeyPoints()}

      {/* Existing expanded content */}
      {state.isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t"
        >
          <div className="p-4">
            {/* Section Tabs - Only show if content exists */}
            {(aiContent?.ai_summary || (aiContent?.ai_key_points && aiContent.ai_key_points.length > 0)) && (
              <div className="flex gap-2 mb-4">
                <Button
                  variant={state.activeSection === 'summary' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setState(prevState => ({ ...prevState, activeSection: 'summary' }))}
                  className="gap-2"
                >
                  <LightbulbIcon className="h-4 w-4" />
                  Summary
                </Button>
                {aiContent?.ai_key_points && aiContent.ai_key_points.length > 0 && (
                  <Button
                    variant={state.activeSection === 'keyPoints' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setState(prevState => ({ ...prevState, activeSection: 'keyPoints' }))}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Key Points
                    <Badge variant="secondary" className="ml-1">
                      {aiContent.ai_key_points.length}
                    </Badge>
                  </Button>
                )}
              </div>
            )}

            {/* Content Sections */}
            <div className="space-y-4">
              {/* Summary Section */}
              {state.activeSection === 'summary' && aiContent?.ai_summary && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <div className="relative">
                    <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded" />
                    <p className="text-sm text-muted-foreground pl-2">
                      {aiContent.ai_summary}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Key Points Section */}
              {state.activeSection === 'keyPoints' && aiContent?.ai_key_points && aiContent.ai_key_points.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="grid gap-4">
                    {aiContent.ai_key_points.map((point, index) => (
                      <Collapsible key={index}>
                        <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/5 transition-colors">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {point.speaker}
                                  </span>
                                  <div className="flex gap-1">
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
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {point.point}
                                </p>
                              </div>
                              <CollapsibleTrigger className="hover:bg-muted/50 p-1.5 rounded-full transition-colors">
                                <ChevronDown className="h-4 w-4" />
                              </CollapsibleTrigger>
                            </div>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="pl-10 pr-4 pb-3 space-y-3">
                            {point.support.length > 0 && (
                              <div className="flex items-start gap-2 p-2 rounded-md bg-success/5 border border-success/10">
                                <ThumbsUp className="h-4 w-4 text-success mt-0.5" />
                                <div className="space-y-1">
                                  <span className="text-sm font-medium text-success">Supporting Members</span>
                                  <p className="text-sm text-muted-foreground">
                                    {point.support.join(', ')}
                                  </p>
                                </div>
                              </div>
                            )}
                            {point.opposition.length > 0 && (
                              <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/10">
                                <ThumbsDown className="h-4 w-4 text-destructive mt-0.5" />
                                <div className="space-y-1">
                                  <span className="text-sm font-medium text-destructive">Opposing Members</span>
                                  <p className="text-sm text-muted-foreground">
                                    {point.opposition.join(', ')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Speakers */}
            {result.AttributedTo && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 pt-4 border-t">
                <UserIcon className="h-4 w-4" />
                <span>{result.AttributedTo}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </Card>
  );
}