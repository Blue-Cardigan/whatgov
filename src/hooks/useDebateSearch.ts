'use client';

import { useState, useCallback } from 'react';
import { useDebounce } from './useDebounce';

export function useDebateSearch(debateId: string) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchDebate = useCallback(async (term: string) => {
    if (!term) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/debates/${debateId}/search?term=${encodeURIComponent(term)}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debateId]);

  const debouncedSearch = useDebounce(searchDebate, 300);

  return {
    results,
    isLoading,
    debouncedSearch
  };
} 