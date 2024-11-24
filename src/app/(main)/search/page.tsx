"use client";

import { useState, useCallback } from 'react';
import { SearchResults } from "@/components/search/SearchResults";
import { QueryBuilder } from '@/components/search/QueryBuilder';
import { HansardAPI } from '@/lib/hansard-api';
import type { SearchResponse, SearchParams } from '@/lib/hansard-api';

export default function Search() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const PAGE_SIZE = 20;
  
  const [searchParams, setSearchParams] = useState<SearchParams>({
    house: 'Commons',
    orderBy: 'SittingDateDesc',
    take: PAGE_SIZE,
  });

  const performSearch = useCallback(async (newParams?: Partial<SearchParams>, loadMore = false) => {
    setIsLoading(true);
    try {
      const params: SearchParams = {
        ...searchParams,
        ...newParams,
        skip: loadMore ? (searchParams.skip || 0) + PAGE_SIZE : 0,
        take: PAGE_SIZE,
      };

      const response = await HansardAPI.search(params);
      setSearchParams(params);
      setResults(prev => loadMore && prev ? {
        ...response,
        Contributions: [...prev.Contributions, ...response.Contributions]
      } : response);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  // Simplified handlers
  const handleSearch = useCallback((params: Partial<SearchParams>) => 
    performSearch(params), [performSearch]);

  return (
    <div className="flex justify-center min-h-screen bg-background">
      <div className="container max-w-2xl py-4 px-4 lg:py-8 lg:px-8">
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
        />
      </div>
    </div>
  );
}