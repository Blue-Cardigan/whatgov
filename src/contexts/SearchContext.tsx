"use client";

import { createContext, useContext, useReducer, useEffect, Dispatch, ReactNode } from 'react';
import type { Citation, SearchResponse, SearchResultAIContent } from '@/types/search';


interface SearchState {
  results: (SearchResponse & { aiContent?: Record<string, SearchResultAIContent> }) | null;
  searchParams: SearchParams;
  aiContent?: Record<string, SearchResultAIContent>;
  isLoading: boolean;
  aiSearch: {
    query: string;
    streamingText: string;
    citations: Citation[];
    isLoading: boolean;
  };
  searchType?: 'ai' | 'hansard' | 'mp';
  mpSearch?: {
    query: string;
    mpId?: string;
    keywords: string[];
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

type SearchAction =
  | { type: 'SET_RESULTS'; payload: SearchResponse }
  | { type: 'SET_PARAMS'; payload: SearchParams }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'APPEND_RESULTS'; payload: SearchResponse }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_AI_SEARCH'; payload: { query: string; streamingText: string; citations: Citation[]; isFinal?: boolean } }
  | { type: 'CLEAR_AI_SEARCH' }
  | { type: 'SET_SEARCH_TYPE'; payload: 'ai' | 'hansard' | 'mp' }
  | { type: 'SET_MP_SEARCH'; payload: { query: string; mpId?: string; keywords: string[] } }
  | { type: 'CLEAR_MP_SEARCH' }
  | { type: 'SET_PAGINATION'; payload: Partial<SearchState['pagination']> };

export interface SearchParams {
  searchTerm: string;
  skip?: number;
  take?: number;
  orderBy?: 'SittingDateAsc' | 'SittingDateDesc';
  resultType?: 'all' | 'debates' | 'written-statements' | 'written-answers' | 'corrections' | 'divisions' | 'members';
}

const initialState: SearchState = {
  results: null,
  searchParams: {
    searchTerm: '',
    skip: 0,
    take: 10,
    orderBy: 'SittingDateDesc',
    resultType: 'all'
  },
  isLoading: false,
  aiSearch: {
    query: '',
    streamingText: '',
    citations: [],
    isLoading: false
  },
  searchType: undefined,
  mpSearch: {
    query: '',
    mpId: undefined,
    keywords: []
  },
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalPages: 1
  }
};

const SearchContext = createContext<{
  state: SearchState;
  dispatch: Dispatch<SearchAction>;
} | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('searchState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Restore all state including AI search
      dispatch({ type: 'SET_RESULTS', payload: parsed.results });
      dispatch({ type: 'SET_PARAMS', payload: parsed.searchParams });
      if (parsed.aiSearch) {
        dispatch({ 
          type: 'SET_AI_SEARCH', 
          payload: {
            query: parsed.aiSearch.query,
            streamingText: parsed.aiSearch.streamingText,
            citations: parsed.aiSearch.citations
          }
        });
      }
    }
  }, []);

  // Save state to sessionStorage on updates
  useEffect(() => {
    sessionStorage.setItem('searchState', JSON.stringify({
      results: state.results,
      searchParams: state.searchParams,
      aiSearch: {
        query: state.aiSearch.query,
        streamingText: state.aiSearch.streamingText,
        citations: state.aiSearch.citations,
        isLoading: state.aiSearch.isLoading
      },
      searchType: state.searchType,
      mpSearch: state.mpSearch
    }));
  }, [
    state.results, 
    state.searchParams, 
    state.aiSearch.query,
    state.aiSearch.streamingText,
    state.aiSearch.citations,
    state.aiSearch.isLoading,
    state.searchType,
    state.mpSearch
  ]);

  return (
    <SearchContext.Provider value={{ state, dispatch }}>
      {children}
    </SearchContext.Provider>
  );
}

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_RESULTS':
      return {
        ...state,
        results: action.payload
      };
    case 'SET_PARAMS':
      return {
        ...state,
        searchParams: {
          ...state.searchParams,
          ...action.payload,
          // Reset pagination when changing result type
          skip: action.payload.resultType !== state.searchParams.resultType ? 0 : action.payload.skip
        }
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'CLEAR_RESULTS':
      return {
        ...state,
        results: null,
        searchParams: initialState.searchParams
      };
    case 'SET_AI_LOADING':
      return {
        ...state,
        aiSearch: {
          ...state.aiSearch,
          isLoading: action.payload
        }
      };
    case 'SET_AI_SEARCH':
      if (action.payload.isFinal) {
        return {
          ...state,
          aiSearch: {
            ...state.aiSearch,
            query: action.payload.query,
            // For final text, completely replace the streaming text
            streamingText: action.payload.streamingText,
            citations: action.payload.citations
          }
        };
      }
      
      // For non-final updates, append to existing text
      return {
        ...state,
        aiSearch: {
          ...state.aiSearch,
          query: action.payload.query,
          streamingText: state.aiSearch.streamingText + action.payload.streamingText,
          citations: action.payload.citations
        }
      };
    case 'CLEAR_AI_SEARCH':
      return {
        ...state,
        aiSearch: {
          ...initialState.aiSearch,
          isLoading: true
        }
      };
    case 'SET_SEARCH_TYPE':
      return {
        ...state,
        searchType: action.payload
      };
    case 'SET_MP_SEARCH':
      return {
        ...state,
        mpSearch: {
          ...action.payload,
          keywords: action.payload.keywords || []
        }
      };
    case 'CLEAR_MP_SEARCH':
      return {
        ...state,
        mpSearch: initialState.mpSearch
      };
    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };
    default:
      return state;
  }
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
} 