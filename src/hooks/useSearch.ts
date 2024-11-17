import { useState, useCallback } from 'react';
import { HansardAPI, SearchParams, Contribution } from '@/lib/hansard-api';
import { useDebounce } from './useDebounce';
import { SearchDirectives } from '@/types/hansard';

interface SearchFilters {
  house: 'Commons' | 'Lords';
  topics: string[];
  parties: string[];
  selectedDate?: Date;
  spokenBy?: string;
}

interface SearchQuery {
  term: string;
  filters: SearchFilters;
  page: number;
  sortOrder: 'SittingDateDesc' | 'SittingDateAsc';
}

interface SearchHook {
  query: SearchQuery;
  updateSearch: (updates: Partial<SearchQuery>) => void;
  resetSearch: () => void;
  results: Contribution[];
  isLoading: boolean;
  totalResults: number;
  loadMore: () => void;
  hasMore: boolean;
  searchTerm: string;
  performSearch: (reset?: boolean) => Promise<void>;
}

export function useSearch(): SearchHook {
  const [query, setQuery] = useState<SearchQuery>({
    term: '',
    filters: {
      house: 'Commons',
      topics: [],
      parties: [],
    },
    page: 1,
    sortOrder: 'SittingDateDesc'
  });
  const [results, setResults] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const pageSize = 10;

  const parseSearchDirectives = useCallback((searchTerm: string): { cleanTerm: string; directives: SearchDirectives } => {
    const directives: SearchDirectives = {};
    const parts = searchTerm.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    
    const directiveMap = {
      'spokenby:': (value: string) => directives.spokenBy = value,
      'debate:': (value: string) => directives.debate = value,
      'words:': (value: string) => directives.words = value,
    };

    const remainingParts = parts.filter(part => {
      for (const [prefix, setter] of Object.entries(directiveMap)) {
        if (part.startsWith(prefix)) {
          setter(part.slice(prefix.length).replace(/"/g, ''));
          return false;
        }
      }
      return true;
    });

    return {
      cleanTerm: remainingParts.join(' '),
      directives
    };
  }, []);

  const performSearch = useCallback(async (reset = true) => {
    const { term, filters, page, sortOrder } = query;
    
    if (!term && !filters.spokenBy && !filters.selectedDate) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { cleanTerm, directives } = parseSearchDirectives(term);
      
      const searchParams: SearchParams = {
        searchTerm: cleanTerm || undefined,
        house: filters.house,
        topics: filters.topics.length > 0 ? filters.topics : undefined,
        parties: filters.parties.length > 0 ? filters.parties : undefined,
        date: filters.selectedDate?.toISOString().split('T')[0],
        spokenBy: directives.spokenBy || filters.spokenBy,
        debateType: directives.debate,
        skip: reset ? 0 : page * pageSize,
        take: pageSize,
        orderBy: sortOrder
      };

      (Object.keys(searchParams) as Array<keyof SearchParams>).forEach(key => {
        if (searchParams[key] === undefined) {
          delete searchParams[key];
        }
      });

      const response = await HansardAPI.searchWithFilters(searchParams);
      setResults(prev => reset ? response.Contributions : [...prev, ...response.Contributions]);
      setTotalResults(response.TotalContributions);
      
      if (!reset) {
        updateSearch({ page: page + 1 });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const debouncedSearch = useDebounce(performSearch, 300);

  const updateSearch = useCallback((updates: Partial<SearchQuery>) => {
    setQuery(prev => ({
      ...prev,
      ...updates,
      page: updates.term !== undefined ? 1 : prev.page
    }));
  }, []);

  const handleSearchUpdate = useCallback((updates: Partial<SearchQuery>) => {
    updateSearch(updates);
    debouncedSearch(true);
  }, [updateSearch, debouncedSearch]);

  const loadMore = useCallback(() => {
    performSearch(false);
  }, [performSearch]);

  const resetSearch = useCallback(() => {
    setQuery({
      term: '',
      filters: {
        house: 'Commons',
        topics: [],
        parties: [],
      },
      page: 1,
      sortOrder: 'SittingDateDesc'
    });
    setResults([]);
    setTotalResults(0);
  }, []);

  return {
    query,
    updateSearch,
    resetSearch,
    results,
    isLoading,
    totalResults,
    loadMore,
    hasMore: results.length < totalResults,
    searchTerm: query.term,
    performSearch,
  };
}