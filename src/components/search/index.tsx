"use client";

import { useState, useCallback } from 'react';
import { useSearch } from '@/contexts/SearchContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/hooks/useEngagement';
import { HansardAPI } from '@/lib/search-api';
import { QueryBuilder } from './QueryBuilder';
import { SearchResults } from './Hansard/SearchResults';
import { StreamedResponse } from './Assistant/StreamedResponse';
import { MPProfileCard } from '@/components/MPProfile/MPProfileCard';
import { MPKeyPoints } from '@/components/MPProfile/MPKeyPoints';
import { MPLinks } from '@/components/MPProfile/MPLinks';
import { MPTopics } from '@/components/MPProfile/MPTopics';
import { SubscriptionCTA } from '@/components/ui/subscription-cta';
import { getMPData, getMPKeyPointsByName } from "@/lib/supabase/mpsearch";
import type { MPData, AiTopic } from "@/types";
import type { MPKeyPointDetails } from "@/lib/supabase/mpsearch";
import { useAssistant } from '@/hooks/useAssistant';
import type { Citation } from '@/types/search';
import { SaveSearchButton } from './SaveSearchButton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/lib/pdf-export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SearchParams } from '@/types/search';

const PAGE_SIZE = 10;

export function Search({ initialTab = 'ai' }: { initialTab?: 'ai' | 'hansard' | 'mp' }) {
  const { state: searchState, dispatch } = useSearch();
  const { user, isEngagedCitizen, isProfessional, loading: authLoading } = useAuth();
  const { recordResearchSearch } = useEngagement();
  const { 
    performFileSearch, 
  } = useAssistant();
  
  // MP Search state
  const [mpData, setMPData] = useState<MPData | null>(null);
  const [keyPoints, setKeyPoints] = useState<MPKeyPointDetails[]>([]);
  const [topics, setTopics] = useState<AiTopic[]>([]);
  const [totalMentions, setTotalMentions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active search type
  const [activeSearchType, setActiveSearchType] = useState<'ai' | 'hansard' | 'mp'>(initialTab);

  const handleStreamingUpdate = useCallback((text: string, citations: Citation[], isFinal: boolean) => {
    dispatch({ 
      type: 'SET_AI_SEARCH', 
      payload: {
        query: searchState.aiSearch.query,
        streamingText: text,
        citations,
        isFinal
      }
    });
  }, [dispatch, searchState.aiSearch.query]);

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
          : JSON.stringify(searchState.results, null, 2),
        citations: activeSearchType === 'ai'
          ? searchState.aiSearch.citations.map(c => c.debate_id)
          : searchState.results?.Contributions.map(c => c.DebateSectionExtId) || [],
        date: new Date(),
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
      // Update search type in context
      dispatch({ type: 'SET_SEARCH_TYPE', payload: activeSearchType });
      
      switch (activeSearchType) {
        case 'ai':
          dispatch({ 
            type: 'SET_AI_LOADING', 
            payload: true 
          });

          dispatch({ 
            type: 'SET_AI_SEARCH', 
            payload: {
              query: searchParams.searchTerm || '',
              streamingText: '',
              citations: []
            }
          });

          await performFileSearch(
            searchParams.searchTerm || '',
            null,
            handleStreamingUpdate,
            handleStreamingComplete,
            useRecentFiles
          );
          break;
          
        case 'hansard':          
          // Set default values for skip/take if not provided
          const params: SearchParams = {
            ...searchParams,
            skip: searchParams.skip || 0,
            take: searchParams.take || 10,
            orderBy: searchParams.orderBy || 'SittingDateDesc'
          };
          
          // Update search params in context
          dispatch({ type: 'SET_PARAMS', payload: params });
          
          const results = await HansardAPI.search(params);
          
          // Update results in context
          dispatch({ type: 'SET_RESULTS', payload: results });
          break;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSearchType, performFileSearch, handleStreamingUpdate, handleStreamingComplete, useRecentFiles, dispatch]);

  const handleSearchTypeChange = (type: 'ai' | 'hansard' | 'mp') => {
    setActiveSearchType(type);
    dispatch({ type: 'CLEAR_RESULTS' });
    setMPData(null);
    setKeyPoints([]);
    setTopics([]);
    setError(null);
  };

  const handleLoadMore = useCallback(async () => {
    if (activeSearchType !== 'hansard' || !searchState.results) return;

    setLoading(true);
    try {
      // Calculate new skip value
      const newSkip = (searchState.searchParams.skip || 0) + (searchState.searchParams.take || 10);
      
      // Update search params with new skip value
      const loadMoreParams: SearchParams = {
        ...searchState.searchParams,
        skip: newSkip,
        take: 10
      };

      const moreResults = await HansardAPI.search(loadMoreParams);

      // Append new results to existing ones
      dispatch({ 
        type: 'APPEND_RESULTS',
        payload: moreResults
      });

    } catch (error) {
      console.error('Error loading more results:', error);
      setError(error instanceof Error ? error.message : 'Failed to load more results');
    } finally {
      setLoading(false);
    }
  }, [activeSearchType, searchState.results, searchState.searchParams, dispatch]);

  const renderResults = () => {
    if (loading && !searchState.aiSearch.streamingText) {
      return <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>;
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
              query: searchState.aiSearch.query,
              streamingText: searchState.aiSearch.streamingText,
              citations: searchState.aiSearch.citations,
            } : undefined}
            hansardSearch={activeSearchType === 'hansard' ? {
              query: searchState.searchParams.searchTerm || '',
              response: searchState.results,
              queryState: {
                searchTerm: searchState.searchParams.searchTerm || '',
                startDate: searchState.searchParams.startDate,
                endDate: searchState.searchParams.endDate,
                house: searchState.searchParams.house
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
        const hasMore = Boolean(
          searchState.results?.TotalContributions && 
          searchState.results.Contributions.length < searchState.results.TotalContributions
        );

        return (
          <div>
            {renderActionButtons()}
            <SearchResults
              results={searchState.results?.Contributions || []}
              isLoading={loading}
              totalResults={searchState.results?.TotalContributions || 0}
              searchParams={searchState.searchParams}
              onSearch={performSearch}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              aiContent={searchState.results?.aiContent}
            />
          </div>
        );

      case 'mp':
        return (
          mpData && (
            <div className="space-y-6">
              <MPProfileCard mpData={mpData} />
              <MPLinks mpData={mpData} />
              {isProfessional || isEngagedCitizen ? (
                <>
                  {topics.length > 0 && (
                    <MPTopics topics={topics} totalMentions={totalMentions} />
                  )}
                  {keyPoints.length > 0 && (
                    <MPKeyPoints keyPoints={keyPoints} />
                  )}
                </>
              ) : (
                <SubscriptionCTA
                  title={isEngagedCitizen ? "Upgrade to view other MPs' activity" : "Upgrade to track MP activity"}
                  description={isEngagedCitizen 
                    ? "Get access to detailed insights for all MPs with a Professional subscription."
                    : "Get detailed insights into MPs' parliamentary contributions, voting records, and key positions."}
                  features={[
                    "View key points for any MP",
                    "Compare MPs' positions on issues",
                    "Track multiple MPs' activities"
                  ]}
                />
              )}
            </div>
          )
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 mt-8">
      <QueryBuilder
        searchParams={{
          searchTerm: searchState.searchParams.searchTerm || '',
          startDate: searchState.searchParams.startDate,
          endDate: searchState.searchParams.endDate,
          house: searchState.searchParams.house
        }}
        onSearch={performSearch}
        searchType={activeSearchType}
        onSearchTypeChange={handleSearchTypeChange}
        useRecentFiles={useRecentFiles}
        onToggleRecentFiles={setUseRecentFiles}
      />

      {renderResults()}
    </div>
  );
}