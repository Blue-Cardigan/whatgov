"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, AlertCircle } from "lucide-react";
import { Contribution } from "@/lib/hansard-api";
import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SearchParams } from '@/lib/hansard-api';
import type { SearchResultAIContent } from '@/types';
import { getSearchResultAIContent } from '@/lib/supabase';
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ExternalLink, UserIcon, MessageSquare, LightbulbIcon } from 'lucide-react';
import { format } from 'date-fns';
import { locationColors, getDebateType } from '@/lib/utils';
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { KeyPointsContent } from '../posts/KeyPointsContent';

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
              <Badge variant="secondary" className="text-xs font-normal">
                {debateType.label}
              </Badge>
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
          <div className="p-4 space-y-4">
            {/* Original Title (if AI title exists) */}
            {aiContent?.ai_title && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Original Title:</span> {result.DebateSection}
              </div>
            )}

            {/* AI Summary */}
            {aiContent?.ai_summary && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Summary
                </h4>
                <p className="text-sm text-muted-foreground">
                  {aiContent.ai_summary}
                </p>
              </div>
            )}

            {/* Key Points (Pro users only) */}
            {aiContent?.ai_key_points && (user && subscription) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LightbulbIcon className="h-4 w-4" />
                  Key Points
                </h4>
                <KeyPointsContent 
                  keyPoints={aiContent.ai_key_points}
                  isActive={true}
                  speakers={[]}
                />
              </div>
            )}

            {/* Speakers */}
            {result.AttributedTo && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
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