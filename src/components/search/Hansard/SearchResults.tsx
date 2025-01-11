"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Contribution } from "@/types/search";
import { useMemo } from 'react';
import type { SearchParams } from '@/types/search';
import { ResultCard } from './ResultCard';

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
  results: Contribution[];
  isLoading: boolean;
  totalResults: number;
  searchParams: SearchParams;
}) {
  // Add grouping logic
  const groupedResults = useMemo(() => {
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
              <p className="text-xs text-muted-foreground">
                Top {results.length} contributions
              </p>
            </>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {isLoading && !groupedResults?.length ? (
          <ResultsSkeleton />
        ) : !groupedResults?.length ? (
          <EmptyState searchTerm={searchParams.searchTerm} />
        ) : (
          <>
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