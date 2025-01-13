"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Contribution } from "@/types/search";
import { useMemo } from 'react';
import type { SearchParams } from '@/types/search';
import { ResultCard } from './ResultCard';
import { locationColors } from '@/lib/utils';
import { format } from 'date-fns';
import type { SearchResponse } from '@/types/search';

interface GroupedContributions {
  debateExtId: string;
  debateSection: string;
  contributions: Contribution[];
  firstContribution: Contribution;
}

export enum DateRange {
  CurrentWeek = 'current-week',
}

export function SearchResults({ 
  results, 
  isLoading, 
  totalResults,
  searchParams,
}: {
  results: SearchResponse;
  isLoading: boolean;
  totalResults: number;
  searchParams: SearchParams;
}) {
  // Add grouping logic
  const groupedResults = useMemo(() => {
    if (!results?.Contributions?.length) return [];
    
    const groups = results.Contributions.reduce((acc, contribution) => {
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

  const renderStatistics = () => {
    if (isLoading) return <Skeleton className="h-24" />;
    if (!results?.Contributions?.length) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Contributions */}
        <Card className="p-4">
          <span className="text-sm text-muted-foreground mb-2 block">Contributions</span>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Spoken Contributions</span>
              <span className="text-sm font-medium">{results.TotalContributions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Debates</span>
              <span className="text-sm font-medium">{results.TotalDebates}</span>
            </div>
          </div>
        </Card>

        {/* Written Items */}
        <Card className="p-4">
          <span className="text-sm text-muted-foreground mb-2 block">Written Items</span>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Written Statements</span>
              <span className="text-sm font-medium">{results.TotalWrittenStatements}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Written Answers</span>
              <span className="text-sm font-medium">{results.TotalWrittenAnswers}</span>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Statistics Section */}
      {renderStatistics()}

      {/* Results List */}
      <div className="space-y-4">
        {isLoading && !groupedResults?.length ? (
          <ResultsSkeleton />
        ) : !groupedResults?.length ? (
          <EmptyState searchTerm={searchParams.searchTerm} />
        ) : (
          <>
            <span className="text-sm text-muted-foreground mb-2 block">
              Showing top {groupedResults.length} results
            </span>
            {groupedResults.map((group: GroupedContributions) => (
              <ResultCard
                key={group.debateExtId}
                result={group.firstContribution}
                contributions={group.contributions}
                searchTerm={searchParams.searchTerm}
              />
            ))}
          </>
        )}
      </div>
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