"use client";

import { useState, useCallback } from 'react';
import { SearchResults } from "@/components/search/SearchResults";
import { QueryBuilder } from '@/components/search/QueryBuilder';
import { HansardAPI } from '@/lib/search-api';
import type { SearchResponse, SearchParams } from '@/types/search';
import type { SearchResultAIContent } from '@/types';
import { SimpleFooter } from '@/components/layout/SimpleFooter';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
import { MONTHLY_AI_SEARCH_LIMIT } from '@/hooks/useEngagement';
import { useAuth } from '@/contexts/AuthContext';

type SearchResultsState = SearchResponse & { 
  aiContent?: Record<string, SearchResultAIContent> 
};

const PAGE_SIZE = 10;

export default function Search() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    searchTerm: '',
    skip: 0,
    take: PAGE_SIZE,
    orderBy: 'SittingDateDesc'
  });
  
  const [results, setResults] = useState<SearchResultsState | null>(null);

  const { user } = useAuth();
  const { recordAISearch, hasReachedAISearchLimit } = useEngagement();
  const { toast } = useToast();

  const performSearch = useCallback(async (newParams?: Partial<SearchParams>, loadMore = false) => {
    setIsLoading(true);
    try {
      const enableAI = user?.id && !hasReachedAISearchLimit();
      
      const params: SearchParams = {
        ...searchParams,
        ...newParams,
        skip: loadMore ? (searchParams.skip || 0) + PAGE_SIZE : 0,
        take: PAGE_SIZE,
        enableAI: enableAI || undefined,
      };

      const response = await HansardAPI.search(params);
      
      if (!loadMore && enableAI) {
        recordAISearch();
      }

      setSearchParams(params);
      setResults(prev => loadMore && prev ? {
        ...response,
        Contributions: [...prev.Contributions, ...response.Contributions],
        aiContent: {
          ...(prev.aiContent || {}),
          ...(response.aiContent || {})
        }
      } : response);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, user, hasReachedAISearchLimit, recordAISearch, toast]);

  // Simplified handlers
  const handleSearch = useCallback((params: Partial<SearchParams>) => 
    performSearch(params), [performSearch]);

  return (
    <div className="min-h-screen flex flex-col md:pr-20">
      <div className="container max-w-xl mx-auto px-4 flex-1">
        <h1 className="text-2xl font-bold mt-4">Search Hansard</h1>
        <p className="text-muted-foreground mb-4">The Official Parliamentary Record</p>
        <div className="mb-8 lg:mb-12">
          <QueryBuilder
            searchParams={searchParams}
            onSearch={handleSearch}
          />
        </div>

        <SearchResults
          results={results?.Contributions || []}
          isLoading={isLoading}
          totalResults={results?.TotalContributions || 0}
          searchParams={searchParams}
          onSearch={handleSearch}
          onLoadMore={() => performSearch(undefined, true)}
          hasMore={Boolean(results?.TotalContributions && results.Contributions.length < results.TotalContributions)}
          aiContent={results?.aiContent}
        />
      </div>
      <SimpleFooter />
    </div>
  );
}