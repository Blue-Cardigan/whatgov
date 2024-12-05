"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SearchParams } from '@/types/search';
import type { MPKeyPointDetails } from '@/lib/supabase/myparliament';
import { MPResultCard } from './MPResultCard';

export function MPSearchResults({ 
  results, 
  isLoading, 
  totalResults,
  searchParams,
  onSearch,
  onLoadMore,
  hasMore,
}: {
  results: MPKeyPointDetails[];
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
            <p className="text-sm text-muted-foreground">
              {totalResults.toLocaleString()} statements found
            </p>
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
        ) : !results.length ? (
          <EmptyState searchTerm={searchParams.searchTerm} />
        ) : (
          results.map((result) => {
            // Find all points from the same debate
            const debatePoints = results.filter(p => p.debate_id === result.debate_id);
            
            return (
              <MPResultCard
                key={`${result.debate_id}-${result.point}`}
                result={result}
                searchTerm={searchParams.searchTerm}
                allDebatePoints={debatePoints}
              />
            );
          })
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

function ResultsSkeleton() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
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
            No statements found for MP {searchTerm}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Enter an MP ID to search their statements...
          </p>
        )}
      </CardContent>
    </Card>
  );
} 