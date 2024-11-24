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
    outputType: 'List',
    includeCurrent: true,
    includeFormer: true,
    includeCommitteeDivisions: false,
    withDivision: false
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

  const handleClear = useCallback(() => {
    setSearchParams(prev => ({
      ...prev,
      searchTerm: undefined,
      date: undefined,
      startDate: undefined,
      endDate: undefined,
      department: undefined,
      committeeTitle: undefined,
      committeeType: undefined
    }));
    setResults(null);
  }, []);

  return (
    <div className="container py-4 px-4 lg:py-8 lg:px-8">
      <div className="mb-8 lg:mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2 lg:mb-3">
          Search Parliamentary Debates
        </h1>
        <QueryBuilder
          searchParams={searchParams}
          onSearch={handleSearch}
          onClear={handleClear}
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
  );
}