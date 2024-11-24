"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight, FileText, MessageSquare, AlertCircle } from "lucide-react";
import { Contribution } from "@/lib/hansard-api";
import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SearchParams } from '@/lib/hansard-api';

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
            No results found for &quot;{searchTerm}&quot;
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
  getResultTypeIcon 
}: { 
  result: Contribution; 
  searchTerm?: string;
  getResultTypeIcon: (section: string) => React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-6">
        <a 
          href={constructHansardUrl(result, searchTerm)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  {getResultTypeIcon(result.Section)}
                  <span>{result.Section}</span>
                </div>
                <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {result.DebateSection}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(result.SittingDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {result.AttributedTo || result.MemberName}
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3">
              {result.ContributionText}
            </p>
          </div>
        </a>
      </CardContent>
    </Card>
  );
}