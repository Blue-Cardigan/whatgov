"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { SearchParams, SearchResponse, SearchResultAIContent } from '@/types/search';

interface SearchState {
  results: SearchResponse | null;
  searchParams: SearchParams;
  aiContent?: Record<string, SearchResultAIContent>;
  isLoading: boolean;
  aiSearch: {
    query: string;
    streamingText: string;
    citations: any[];
    isLoading: boolean;
  };
}

type SearchAction =
  | { type: 'SET_RESULTS'; payload: SearchResponse }
  | { type: 'SET_PARAMS'; payload: SearchParams }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'APPEND_RESULTS'; payload: SearchResponse }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_AI_SEARCH'; payload: { query: string; streamingText: string; citations: any[] } }
  | { type: 'CLEAR_AI_SEARCH' };

const initialState: SearchState = {
  results: null,
  searchParams: {
    searchTerm: '',
    skip: 0,
    take: 10,
    orderBy: 'SittingDateDesc'
  },
  isLoading: false,
  aiSearch: {
    query: '',
    streamingText: '',
    citations: [],
    isLoading: false
  }
};

const SearchContext = createContext<{
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
} | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
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
      }
    }));
  }, [
    state.results, 
    state.searchParams, 
    state.aiSearch.query,
    state.aiSearch.streamingText,
    state.aiSearch.citations,
    state.aiSearch.isLoading
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
        searchParams: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'APPEND_RESULTS':
      if (!state.results) return { ...state, results: action.payload };
      return {
        ...state,
        results: {
          ...action.payload,
          Contributions: [
            ...state.results.Contributions,
            ...action.payload.Contributions
          ],
          aiContent: {
            ...(state.results.aiContent || {}),
            ...(action.payload.aiContent || {})
          }
        }
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
      return {
        ...state,
        aiSearch: {
          ...state.aiSearch,
          query: action.payload.query,
          streamingText: action.payload.streamingText,
          citations: action.payload.citations
        }
      };
    case 'CLEAR_AI_SEARCH':
      return {
        ...state,
        aiSearch: initialState.aiSearch
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