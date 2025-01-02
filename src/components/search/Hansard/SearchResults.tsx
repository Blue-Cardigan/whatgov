"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, AlertCircle, MessageSquare } from "lucide-react";
import { Contribution } from "@/types/search";
import { useCallback, useMemo } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SearchParams } from '@/types/search';
import type { SearchResultAIContent } from "@/types/search";
import { ResultCard } from './ResultCard';
import { SaveSearchButton } from '../SaveSearchButton';
import type { SearchResponse } from '@/types/search';

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
  const handleSortOrderChange = useCallback((orderBy: SearchParams['orderBy']) => {
    onSearch({ orderBy });
  }, [onSearch]);

  // Memoize helper functions
  const getTotalResults = useCallback(() => {
    if (!totalResults) return "0";
    return totalResults.toLocaleString();
  }, [totalResults]);

  const getResultTypeIcon = useCallback((section: string) => {
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

  // Update the categorization to match the API response structure
  const getResultMetadata = useCallback((): SearchResponse => {
    const metadata: SearchResponse = {
      TotalMembers: new Set(results.map(c => c.MemberId).filter(Boolean)).size,
      TotalContributions: totalResults,
      TotalWrittenStatements: 0,
      TotalWrittenAnswers: 0,
      TotalCorrections: 0,
      TotalPetitions: 0,
      TotalDebates: groupedResults.length,
      TotalCommittees: 0,
      TotalDivisions: 0,
      SearchTerms: searchParams.searchTerm ? [searchParams.searchTerm] : [],
      Members: [],
      Contributions: results,
      WrittenStatements: [],
      WrittenAnswers: [],
      Corrections: [],
      Petitions: [],
      Debates: [],
      Divisions: [],
      Committees: []
    };

    // Categorize contributions based on their section
    results.forEach(contribution => {
      switch (contribution.DebateSection) {
        case 'Written Statements':
          metadata.WrittenStatements.push(contribution);
          metadata.TotalWrittenStatements++;
          break;
        case 'Written Answers':
          metadata.WrittenAnswers.push(contribution);
          metadata.TotalWrittenAnswers++;
          break;
        case 'Written Corrections':
          metadata.Corrections.push(contribution);
          metadata.TotalCorrections++;
          break;
      }
    });

    return metadata;
  }, [results, totalResults, groupedResults, searchParams.searchTerm]);

  // Update the SaveSearchButton section
  const renderSaveButton = () => {
    if (!results.length || isLoading) return null;

    return (
      <SaveSearchButton 
        hansardSearch={{
          query: searchParams.searchTerm || '',
          queryState: {
            searchTerm: searchParams.searchTerm || '',
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
            house: searchParams.house || 'Commons',
            enableAI: searchParams.enableAI,
            skip: searchParams.skip,
            take: searchParams.take,
            orderBy: searchParams.orderBy
          },
          results: getResultMetadata()
        }}
        searchType="hansard"
      />
    );
  };

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

        <div className="flex items-center gap-4">
          {renderSaveButton()}
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
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {isLoading && !groupedResults?.length ? (
          <ResultsSkeleton />
        ) : !groupedResults?.length ? (
          <EmptyState searchTerm={searchParams.searchTerm} />
        ) : (
          groupedResults.map((group: GroupedContributions) => (
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