"use client";

import { useState, useCallback } from 'react';
import { SearchResults } from "@/components/search/SearchResults";
import { MPSearchResults } from "@/components/search/MPSearchResults";
import { QueryBuilder } from '@/components/search/QueryBuilder';
import { HansardAPI } from '@/lib/search-api';
import { getMPKeyPointsByName } from '@/lib/supabase/myparliament';
import type { SearchResponse, SearchParams } from '@/types/search';
import type { SearchResultAIContent } from '@/types/search';
import type { MPKeyPointDetails } from '@/lib/supabase/myparliament';
import { SimpleFooter } from '@/components/layout/SimpleFooter';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SearchResultsState = SearchResponse & { 
  aiContent?: Record<string, SearchResultAIContent> 
};

type MPSearchResultsState = {
  data: MPKeyPointDetails[];
  count: number;
};

const PAGE_SIZE = 10;

export default function Search() {
  const [activeTab, setActiveTab] = useState<'hansard' | 'mp'>('hansard');
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    searchTerm: '',
    skip: 0,
    take: PAGE_SIZE,
    orderBy: 'SittingDateDesc'
  });
  
  const [results, setResults] = useState<SearchResultsState | null>(null);
  const [mpResults, setMPResults] = useState<MPSearchResultsState | null>(null);

  const { user } = useAuth();
  const { recordAISearch, hasReachedAISearchLimit } = useEngagement();
  const { toast } = useToast();

  const performSearch = useCallback(async (newParams?: Partial<SearchParams>, loadMore = false) => {
    setIsLoading(true);
    try {
      if (activeTab === 'hansard') {
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
      } else {
        // MP Search
        const params = {
          ...searchParams,
          ...newParams,
          offset: loadMore ? (searchParams.skip || 0) + PAGE_SIZE : 0,
          limit: PAGE_SIZE,
        };

        const response = await getMPKeyPointsByName(params.searchTerm || '', {
          limit: params.limit,
          offset: params.offset,
        });

        setSearchParams(params);
        setMPResults(prev => loadMore && prev ? {
          data: [...prev.data, ...response.data],
          count: response.count,
        } : response);
      }
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
  }, [searchParams, user, hasReachedAISearchLimit, recordAISearch, toast, activeTab]);

  // Simplified handlers
  const handleSearch = useCallback((params: Partial<SearchParams>) => 
    performSearch(params), [performSearch]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'hansard' | 'mp');
    setResults(null);
    setMPResults(null);
    setSearchParams({
      searchTerm: '',
      skip: 0,
      take: PAGE_SIZE,
      orderBy: 'SittingDateDesc'
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:pr-20">
      <div className="container max-w-xl mx-auto px-4 flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="hansard">Hansard Search</TabsTrigger>
            <TabsTrigger value="mp">MP Statements</TabsTrigger>
          </TabsList>

          <TabsContent value="hansard">
            <h1 className="text-2xl font-bold mt-4">Search Hansard</h1>
            <p className="text-muted-foreground mb-4">The Official Parliamentary Record</p>
            <div className="mb-8 lg:mb-12">
              <QueryBuilder
                searchParams={searchParams}
                onSearch={handleSearch}
                mode="hansard"
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
          </TabsContent>

          <TabsContent value="mp">
            <h1 className="text-2xl font-bold mt-4">Search MP Statements</h1>
            <p className="text-muted-foreground mb-4">Find key points made by MPs</p>
            <div className="mb-8 lg:mb-12">
              <QueryBuilder
                searchParams={searchParams}
                onSearch={handleSearch}
                mode="mp"
              />
            </div>

            <MPSearchResults
              results={mpResults?.data || []}
              isLoading={isLoading}
              totalResults={mpResults?.count || 0}
              searchParams={searchParams}
              onSearch={handleSearch}
              onLoadMore={() => performSearch(undefined, true)}
              hasMore={Boolean(mpResults?.count && mpResults.data.length < mpResults.count)}
            />
          </TabsContent>
        </Tabs>
      </div>
      <SimpleFooter />
    </div>
  );
}