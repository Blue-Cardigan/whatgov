"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Contribution } from "@/lib/hansard-api";
import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SearchParams } from '@/lib/hansard-api';
import type { SearchResultAIContent } from '@/types';
import { getSearchResultAIContent } from '@/lib/supabase';
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ExternalLink, UserIcon, MessageSquare, LightbulbIcon, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { locationColors, getDebateType } from '@/lib/utils';
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { KeyPointsContent } from '../posts/KeyPointsContent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function constructHansardUrl(result: Contribution, searchTerm?: string) {
  // Format the date (yyyy-mm-dd)
  const formattedDate = result.SittingDate.split('T')[0];

  // Format the debate title for the URL (lowercase, hyphens)
  const formattedTitle = result.DebateSection
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  // Construct the base URL
  const baseUrl = `https://hansard.parliament.uk/${result.House}/${formattedDate}/debates/${result.DebateSectionExtId}/${formattedTitle}`;

  // Add search term highlight if provided
  const highlightParam = searchTerm ? `?highlight=${encodeURIComponent(searchTerm)}` : '';

  // Add contribution anchor
  const contributionAnchor = `#contribution-${result.ContributionExtId}`;

  return `${baseUrl}${highlightParam}${contributionAnchor}`;
}

export function SearchResults({ 
  results, 
  isLoading, 
  totalResults,
  searchParams,
  onSearch,
  onLoadMore,
  hasMore
}: {
  results: Contribution[];
  isLoading: boolean;
  totalResults: number;
  searchParams: SearchParams;
  onSearch: (params: Partial<SearchParams>) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  const handleSortOrderChange = React.useCallback((orderBy: SearchParams['orderBy']) => {
    onSearch({ orderBy });
  }, [onSearch]);

  // Memoize helper functions
  const getTotalResults = React.useCallback(() => {
    if (!totalResults) return "0";
    return totalResults.toLocaleString();
  }, [totalResults]);

  const getResultTypeIcon = React.useCallback((section: string) => {
    switch (section) {
      case 'Written Statements':
        return <FileText className="h-4 w-4" />;
      case 'Written Answers':
        return <MessageSquare className="h-4 w-4" />;
      case 'Written Corrections':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  }, []);

  // Add state for AI content
  const [resultsWithAi, setResultsWithAi] = React.useState<Map<string, SearchResultAIContent>>(new Map());

  // Add effect to fetch AI content
  React.useEffect(() => {
    const fetchAiContent = async () => {
      const newAiContent = new Map(resultsWithAi);
      
      // Only fetch for results that we don't already have
      const unfetchedResults = results.filter(
        result => !newAiContent.has(result.DebateSectionExtId)
      );

      if (unfetchedResults.length === 0) return;

      // Fetch AI content for each result
      await Promise.all(
        unfetchedResults.map(async (result) => {
          const aiContent = await getSearchResultAIContent(result.DebateSectionExtId);
          if (aiContent) {
            newAiContent.set(result.DebateSectionExtId, aiContent);
          }
        })
      );

      setResultsWithAi(newAiContent);
    };

    if (!isLoading && results.length > 0) {
      fetchAiContent();
    }
  }, [results, isLoading, resultsWithAi]);

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {getTotalResults()} results found
              </p>
              <p className="text-xs text-muted-foreground">
                Including {results.length} contributions
              </p>
            </>
          )}
        </div>

        <Select
          value={searchParams.orderBy}
          onValueChange={(value) => handleSortOrderChange(value as SearchParams['orderBy'])}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SittingDateDesc">Most Recent</SelectItem>
            <SelectItem value="SittingDateAsc">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {isLoading ? (
          <ResultsSkeleton />
        ) : !results?.length ? (
          <EmptyState searchTerm={searchParams.searchTerm} />
        ) : (
          results.map((result) => (
            <ResultCard
              key={result.ContributionExtId}
              result={result}
              searchTerm={searchParams.searchTerm}
              getResultTypeIcon={getResultTypeIcon}
              aiContent={resultsWithAi.get(result.DebateSectionExtId)}
            />
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            className="gap-2"
          >
            Load More Results
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Subcomponents for better organisation
function ResultsSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-96" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function EmptyState({ searchTerm }: { searchTerm?: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        {searchTerm ? (
          <p className="text-muted-foreground">
            No results found for {searchTerm}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Start typing to search debates...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({ 
  result, 
  searchTerm,
  getResultTypeIcon,
  aiContent 
}: { 
  result: Contribution;
  searchTerm?: string;
  getResultTypeIcon: (section: string) => React.ReactNode;
  aiContent?: SearchResultAIContent;
}) {
  const { user, subscription } = useAuth();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const debateType = React.useMemo(() => getDebateType(result.Section), [result.Section]);
  const [activeSection, setActiveSection] = React.useState<'summary' | 'keyPoints'>('summary');

  const formattedDate = React.useMemo(() => {
    const date = new Date(result.SittingDate);
    const isCurrentYear = date.getFullYear() === new Date().getFullYear();
    return format(date, isCurrentYear ? 'dd MMM' : 'dd MMM yyyy');
  }, [result.SittingDate]);

  return (
    <Card 
      className={cn(
        "overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md",
        "flex flex-col"
      )}
      style={{ 
        borderLeftColor: locationColors[result.House] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[result.House]}15, transparent 10%)`,
      }}
    >
      {/* Compact Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            {formattedDate}
            {debateType && (
              <>
                <Badge variant="secondary" className="text-xs font-normal">
                  {debateType.label}
                </Badge>
                {getResultTypeIcon(result.Section)}
              </>
            )}
          </div>
          
          <h3 className="font-medium">
            {aiContent?.ai_title || result.DebateSection}
          </h3>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(constructHansardUrl(result, searchTerm), '_blank');
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
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
                  variant={activeSection === 'summary' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSection('summary')}
                  className="gap-2"
                >
                  <LightbulbIcon className="h-4 w-4" />
                  Summary
                </Button>
                {aiContent?.ai_key_points && aiContent.ai_key_points.length > 0 && (
                  <Button
                    variant={activeSection === 'keyPoints' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveSection('keyPoints')}
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
              {activeSection === 'summary' && aiContent?.ai_summary && (
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
              {activeSection === 'keyPoints' && aiContent?.ai_key_points && aiContent.ai_key_points.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="grid gap-3">
                    {aiContent.ai_key_points.map((point, index) => (
                      <Collapsible key={index}>
                        <div className="flex gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {point.speaker}
                                </span>
                                {point.support.length > 0 && (
                                  <Badge variant="secondary" className="gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    {point.support.length}
                                  </Badge>
                                )}
                              </div>
                              <CollapsibleTrigger className="hover:bg-muted/50 p-1 rounded">
                                <ChevronDown className="h-4 w-4" />
                              </CollapsibleTrigger>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {point.point}
                            </p>
                          </div>
                        </div>
                        
                        <CollapsibleContent className="pl-8 pt-2">
                          <div className="space-y-2">
                            {point.support.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ThumbsUp className="h-3 w-3 text-success" />
                                <span>Supported by {point.support.join(', ')}</span>
                              </div>
                            )}
                            {point.opposition.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ThumbsDown className="h-3 w-3 text-destructive" />
                                <span>Opposed by {point.opposition.join(', ')}</span>
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