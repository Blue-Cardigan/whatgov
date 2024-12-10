import { useCallback } from 'react';
import { SearchResults } from "./SearchResults";
import { QueryBuilder } from './QueryBuilder';
import { HansardAPI } from '@/lib/search-api';
import type { SearchParams } from '@/types/search';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';

const PAGE_SIZE = 10;

export function HansardSearch() {
  const { state, dispatch } = useSearch();
  const { user } = useAuth();
  const { recordResearchSearch } = useEngagement();
  const { toast } = useToast();

  const performSearch = useCallback(async (newParams?: Partial<SearchParams>, loadMore = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const enableAI = Boolean(user?.id);
      
      const params: SearchParams = {
        ...state.searchParams,
        ...newParams,
        skip: loadMore ? (state.searchParams.skip || 0) + PAGE_SIZE : 0,
        take: PAGE_SIZE,
        enableAI: enableAI || undefined,
      };

      const response = await HansardAPI.search(params);
      
      if (!loadMore && enableAI && params.enableAI) {
        await recordResearchSearch();
      }

      dispatch({ type: 'SET_PARAMS', payload: params });
      dispatch({ 
        type: loadMore ? 'APPEND_RESULTS' : 'SET_RESULTS', 
        payload: response 
      });
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.searchParams, user, recordResearchSearch, toast, dispatch]);

  const handleSearch = useCallback((params: Partial<SearchParams>) => 
    performSearch(params), [performSearch]);

  return (
    <div>
      <h1 className="text-2xl font-bold mt-4">Search Hansard</h1>
      <p className="text-muted-foreground mb-4">The Official Parliamentary Record</p>
      <div className="mb-8 lg:mb-12">
        <QueryBuilder
          searchParams={state.searchParams}
          onSearch={handleSearch}
          mode="hansard"
        />
      </div>

      <SearchResults
        results={state.results?.Contributions || []}
        isLoading={state.isLoading}
        totalResults={state.results?.TotalContributions || 0}
        searchParams={state.searchParams}
        onSearch={handleSearch}
        onLoadMore={() => performSearch(undefined, true)}
        hasMore={Boolean(state.results?.TotalContributions && 
          state.results.Contributions.length < state.results.TotalContributions)}
        aiContent={state.results?.aiContent}
      />
    </div>
  );
} 