"use client";

import { useState, useCallback } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { SearchResults } from "@/components/search/SearchResults";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { QueryBuilder } from '@/components/search/QueryBuilder';

export default function Search() {
  const searchHook = useSearch();
  const { 
    query,
    updateSearch,
    resetSearch,
    isLoading,
    searchTerm: currentSearchTerm,
    performSearch
  } = searchHook;

  const [localSearchTerm, setLocalSearchTerm] = useState(currentSearchTerm);
  const filterOptions = useFilterOptions();

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
    <div className="container max-w-7xl py-8">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Search Parliamentary Debates</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Search across all parliamentary debates, written statements, and questions
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-3xl">
          <QueryBuilder
            value={localSearchTerm}
            onChange={handleSearchTermChange}
            onSubmit={handleSubmit}
            onClear={handleClear}
            house={query.filters.house}
            onHouseChange={handleHouseChange}
          />
        </div>

        {/* Active Search Terms */}
        {(localSearchTerm || query.filters.spokenBy) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {localSearchTerm && (
              <Badge variant="secondary">
                Search: {localSearchTerm}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {query.filters.spokenBy && (
              <Badge variant="secondary" className="flex items-center gap-1">
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
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Results */}
        <div className="md:col-span-3">
          <SearchResults searchHook={searchHook} />
        </div>
      </div>
    </div>
  );
}