"use client";

import { useState, useCallback } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { Button } from "@/components/ui/button";

import { SearchResults } from "@/components/search/SearchResults";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { QueryBuilder } from '@/components/search/QueryBuilder';

export default function Search() {
  const searchHook = useSearch();
  const { 
    query,
    updateSearch,
    resetSearch,
    searchTerm: currentSearchTerm,
    performSearch
  } = searchHook;

  const [localSearchTerm, setLocalSearchTerm] = useState(currentSearchTerm);

  // Handle filter changes
  const handleSpokenByChange = useCallback((value?: string) => {
    updateSearch({ 
      filters: { ...query.filters, spokenBy: value }
    });
  }, [updateSearch, query.filters]);

  const handleSearchTermChange = useCallback((value: string) => {
    setLocalSearchTerm(value);
    // Debounce the search update to avoid too many requests
    const timeoutId = setTimeout(() => {
      updateSearch({ term: value });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [updateSearch]);

  const handleSubmit = useCallback(() => {
    // Trigger immediate search without debounce
    performSearch(true);
  }, [performSearch]);

  const handleClear = useCallback(() => {
    setLocalSearchTerm('');
    resetSearch();
  }, [resetSearch]);

  // Handle house change
  const handleHouseChange = useCallback((value: 'Commons' | 'Lords') => {
    updateSearch({ 
      filters: { ...query.filters, house: value }
    });
  }, [updateSearch, query.filters]);

  return (
    <div className="container py-4 px-4 lg:py-8 lg:px-8">
      {/* Hero Section */}
      <div className="mb-8 lg:mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2 lg:mb-3">Search Parliamentary Debates</h1>
        <p className="text-muted-foreground text-base lg:text-lg mb-4 lg:mb-6">
          Search across all parliamentary debates, written statements, and questions
        </p>
        
        {/* Search Section */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative w-full lg:max-w-3xl">
            <QueryBuilder
              value={localSearchTerm}
              onChange={handleSearchTermChange}
              onSubmit={handleSubmit}
              onClear={handleClear}
              house={query.filters.house}
              onHouseChange={handleHouseChange}
            />
          </div>

          {/* Speaker Filter Badge */}
          {query.filters.spokenBy && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1 text-sm">
                Spoken by: {query.filters.spokenBy}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleSpokenByChange(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="w-full">
        <SearchResults searchHook={searchHook} />
      </div>
    </div>
  );
}