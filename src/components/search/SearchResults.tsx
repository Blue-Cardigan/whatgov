"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, AlertCircle, ChevronDown, Settings2, ExternalLink, Users, MessageSquare, LightbulbIcon, ThumbsUp, ThumbsDown } from "lucide-react";
import { Contribution } from "@/types/search";
import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SearchParams } from '@/types/search';
import { SearchResultAIContent } from "@/types";
import { ResultCard } from './ResultCard';

// Add new interface for grouped results
interface GroupedContributions {
  debateExtId: string;
  debateSection: string;
  contributions: Contribution[];
  firstContribution: Contribution;
}

export function SearchResults({ 
  results, 
  isLoading, 
  totalResults,
  searchParams,
  onSearch,
  onLoadMore,
  hasMore,
  aiContent
}: {
  results: Contribution[];
  isLoading: boolean;
  totalResults: number;
  searchParams: SearchParams;
  onSearch: (params: Partial<SearchParams>) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  aiContent?: Record<string, SearchResultAIContent>;
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

  // Add grouping logic
  const groupedResults = React.useMemo(() => {
    const groups = results.reduce((acc, contribution) => {
      const key = contribution.DebateSectionExtId;
      if (!acc[key]) {
        acc[key] = {
          debateExtId: key,
          debateSection: contribution.DebateSection,
          contributions: [],
          firstContribution: contribution
        };
      }
      acc[key].contributions.push(contribution);
      return acc;
    }, {} as Record<string, GroupedContributions>);

    return Object.values(groups);
  }, [results]);

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
        {isLoading && !groupedResults?.length ? (
          <ResultsSkeleton />
        ) : !groupedResults?.length ? (
          <EmptyState searchTerm={searchParams.searchTerm} />
        ) : (
          groupedResults.map((group) => (
            <ResultCard
              key={group.debateExtId}
              result={group.firstContribution}
              contributions={group.contributions}
              searchTerm={searchParams.searchTerm}
              getResultTypeIcon={getResultTypeIcon}
              aiContent={aiContent?.[group.debateExtId]}
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
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-2">
                <div className="space-y-2 w-full sm:w-auto">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full sm:w-96" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-4 w-24 sm:w-32" />
                <Skeleton className="h-4 w-24 sm:w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full sm:w-5/6" />
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