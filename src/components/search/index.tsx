"use client";

import { useState, useCallback } from 'react';
import { useSearch } from '@/contexts/SearchContext';
import { useAuth } from '@/contexts/AuthContext';
import { HansardAPI } from '@/lib/search-api';
import { QueryBuilder } from './QueryBuilder';
import { SearchResults } from './Hansard/SearchResults';
import { StreamedResponse } from './Assistant/StreamedResponse';
import { MPProfileCard } from '@/components/search/MPProfile/MPProfileCard';
import { MPLinks } from '@/components/search/MPProfile/MPLinks';
import { SubscriptionCTA } from '@/components/ui/subscription-cta';
import { getMPData } from "@/lib/supabase/mpsearch";
import type { MPData } from "@/types";
import { useAssistant } from '@/hooks/useAssistant';
import type { Citation } from '@/types/search';
import { SaveSearchButton } from './SaveSearchButton';
import { Button } from '@/components/ui/button';
import { exportToPDF } from '@/lib/pdf-export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SearchParams } from '@/types/search';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { Card } from "@/components/ui/card";
import { Clock, Check, Download } from "lucide-react";
import createClient from '@/lib/supabase/client';
import { MPSearchResults } from './MPProfile/MPSearchResults';

export function Search({ initialTab = 'ai' }: { initialTab?: 'ai' | 'hansard' | 'mp' }) {
  const { state: searchState, dispatch } = useSearch();
  const { isProfessional } = useAuth();
  const { 
    performAISearch, 
  } = useAssistant();
  
  // MP Search state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active search type
  const [activeSearchType, setActiveSearchType] = useState<'ai' | 'hansard' | 'mp'>(initialTab);

  const supabase = createClient();

  const handleStreamingUpdate = useCallback((text: string, citations: Citation[], isFinal: boolean) => {
    dispatch({ 
      type: 'SET_AI_SEARCH', 
      payload: {
        query: searchState.searchParams.searchTerm || '',
        streamingText: text,
        citations,
        isFinal
      }
    });
  }, [dispatch, searchState.searchParams.searchTerm]);

  const handleStreamingComplete = useCallback(() => {
    dispatch({ 
      type: 'SET_AI_LOADING', 
      payload: false 
    });
  }, [dispatch]);

  const [useRecentFiles, setUseRecentFiles] = useState(true);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportToPDF({
        title: searchState.searchParams.searchTerm || '',
        content: activeSearchType === 'ai' 
          ? searchState.aiSearch.streamingText 
          : JSON.stringify(searchState.results?.Debates, null, 2) || '',
        citations: activeSearchType === 'ai'
          ? searchState.aiSearch.citations.map(c => c.debate_id)
          : searchState.results?.Debates.map(d => d.debate_id) || [],
        date: new Date(),
        searchType: activeSearchType as 'ai' | 'hansard' | 'calendar',
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const performSearch = useCallback(async (searchParams: SearchParams) => {
    setLoading(true);
    setError(null);
    
    try {
      dispatch({ type: 'SET_SEARCH_TYPE', payload: activeSearchType });
      
      switch (activeSearchType) {
        case 'mp':
          const mpResults = await getMPData(searchParams.searchTerm);
          console.log(mpResults);
          if (mpResults && mpResults.length > 0) {
            dispatch({ 
              type: 'SET_MP_SEARCH', 
              payload: { 
                query: searchParams.searchTerm,
                mpIds: mpResults.map(mp => mp.member_id.toString()),
                keywords: [],
                results: mpResults
              }
            });
          } else {
            setError(`No MP found matching "${searchParams.searchTerm}"`);
          }
          break;

        case 'ai':
          dispatch({ 
            type: 'CLEAR_AI_SEARCH' 
          });
          
          dispatch({ 
            type: 'SET_AI_LOADING', 
            payload: true 
          });

          const searchTerm = searchParams.searchTerm || '';
          dispatch({ type: 'SET_PARAMS', payload: { searchTerm } });

          await performAISearch(
            searchTerm,
            null,
            handleStreamingUpdate,
            handleStreamingComplete,
            useRecentFiles
          );
          break;
          
          case 'hansard':          

          const params: SearchParams = {
            ...searchParams,
            searchTerm: searchParams.searchTerm || '',
            house: searchParams.house || 'Commons',
            type: searchParams.type,
            dateFrom: searchParams.dateFrom,
            dateTo: searchParams.dateTo
          };
          
          dispatch({ type: 'SET_PARAMS', payload: params });
          
          const { data: debates, error: dbError } = await supabase
            .rpc('search_debates', { 
              search_term: params.searchTerm,
              house_filter: params.house || null,
              type_filter: params.type || null,
              date_from: params.dateFrom || null,
              date_to: params.dateTo || null
            });
        
          if (dbError) throw dbError;
        
          const results: typeof SearchResults = {
            TotalDebates: debates?.length || 0,
            Debates: debates || [],
            SearchTerms: [params.searchTerm]
          };
        
          dispatch({ type: 'SET_RESULTS', payload: results });
          break;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSearchType, performAISearch, handleStreamingUpdate, handleStreamingComplete, useRecentFiles, dispatch]);

  const handleSearchTypeChange = (type: 'ai' | 'hansard' | 'mp') => {
    setActiveSearchType(type);
    dispatch({ type: 'CLEAR_RESULTS' });
    setError(null);
  };

  const renderResults = () => {
    if (loading && !searchState.aiSearch.streamingText) {
      return <LoadingAnimation />;
    }

    if (error) {
      return <div className="text-red-500 text-center py-4">{error}</div>;
    }

    const renderActionButtons = () => {
      if (loading || (!searchState.aiSearch.streamingText && !searchState.results?.Contributions?.length)) {
        return null;
      }

      return (
        <div className="flex gap-2 mb-4">
          <SaveSearchButton
            searchType={activeSearchType}
            aiSearch={activeSearchType === 'ai' ? {
              query: searchState.searchParams.searchTerm || '',
              streamingText: searchState.aiSearch.streamingText,
              citations: searchState.aiSearch.citations,
            } : undefined}
            hansardSearch={activeSearchType === 'hansard' ? {
              query: searchState.searchParams.searchTerm || '',
              response: {
                TotalDebates: searchState.results?.TotalDebates || 0,
                Debates: searchState.results?.Debates || [],
                SearchTerms: searchState.results?.SearchTerms || []
              },
              queryState: {
                searchTerm: searchState.searchParams.searchTerm || '',
                house: searchState.searchParams.house || 'Commons',
              }
            } : undefined}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Export to PDF
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    };

    switch (activeSearchType) {
      case 'ai':
        return (
          <div>
            {renderActionButtons()}
            <StreamedResponse
              streamingText={searchState.aiSearch.streamingText}
              citations={searchState.aiSearch.citations}
              isLoading={searchState.aiSearch.isLoading}
              query={searchState.aiSearch.query}
            />
          </div>
        );

      case 'hansard':
        return (
          <div>
            {renderActionButtons()}
            <SearchResults
              results={searchState.results || {
                TotalMembers: 0,
                TotalContributions: 0,
                TotalWrittenStatements: 0,
                TotalWrittenAnswers: 0,
                TotalCorrections: 0,
                TotalPetitions: 0,
                TotalDebates: 0,
                TotalCommittees: 0,
                TotalDivisions: 0,
                SearchTerms: [],
                Members: [],
                Contributions: [],
                WrittenStatements: [],
                WrittenAnswers: [],
                Corrections: [],
                Petitions: [],
                Debates: [],
                Divisions: [],
                Committees: []
              }}
              isLoading={loading}
              totalResults={searchState.results?.TotalContributions || 0}
              searchParams={searchState.searchParams}
            />
          </div>
        );
        
        case 'mp':
          return searchState.mpSearch.results.length > 0 && (
            <div>
            {renderActionButtons()}
            <MPSearchResults 
              results={searchState.mpSearch.results}
              isLoading={loading}
              isProfessional={isProfessional}
              searchTerm={searchState.searchParams.searchTerm}
            />
          </div>
          );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-2 mt-4 logo-font">PARLIAMENTARY SEARCH</h1>
        <div className="h-px bg-primary w-full mb-3" />
      </div>

      {/* Search Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
        <QueryBuilder
          searchParams={{
            searchTerm: searchState.searchParams.searchTerm || '',
            house: searchState.searchParams.house as 'commons' | 'lords' | null | undefined
          }}
          onSearch={performSearch as (params: { searchTerm: string; house?: 'commons' | 'lords' | null | undefined; }) => void}
          searchType={activeSearchType}
          onSearchTypeChange={handleSearchTypeChange}
          useRecentFiles={useRecentFiles}
          onToggleRecentFiles={setUseRecentFiles}
        />

        {/* Right Column - Tips Card */}
        <div className="hidden lg:block">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Search Tips</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Use the AI Assistant to ask natural questions about parliamentary activity.
              </p>
              <p>
                Search Hansard directly to find specific debates, statements, and written answers.
              </p>
              <p>
                Look up MPs to see their recent contributions and voting records.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Full Width Results */}
      <div className="w-full">
        {renderResults()}
      </div>
    </div>
  );
}