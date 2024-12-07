"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { SearchParams, SearchResponse, SearchResultAIContent } from '@/types/search';

interface SearchState {
  results: SearchResponse | null;
  searchParams: SearchParams;
  aiContent?: Record<string, SearchResultAIContent>;
  isLoading: boolean;
}

type SearchAction =
  | { type: 'SET_RESULTS'; payload: SearchResponse }
  | { type: 'SET_PARAMS'; payload: SearchParams }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'APPEND_RESULTS'; payload: SearchResponse }
  | { type: 'CLEAR_RESULTS' };

const initialState: SearchState = {
  results: null,
  searchParams: {
    searchTerm: '',
    skip: 0,
    take: 10,
    orderBy: 'SittingDateDesc'
  },
  isLoading: false
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
      dispatch({ type: 'SET_RESULTS', payload: parsed.results });
      dispatch({ type: 'SET_PARAMS', payload: parsed.searchParams });
    }
  }, []);

  // Save state to sessionStorage on updates
  useEffect(() => {
    if (state.results) {
      sessionStorage.setItem('searchState', JSON.stringify({
        results: state.results,
        searchParams: state.searchParams
      }));
    }
  }, [state.results, state.searchParams]);

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