"use client";

import { useState, useCallback } from 'react';
import { useSearch } from '@/contexts/SearchContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/hooks/useEngagement';
import { HansardAPI } from '@/lib/search-api';
import { QueryBuilder } from './QueryBuilder';
import { DateRange, SearchResults } from './Hansard/SearchResults';
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
import { LoadingAnimation } from '@/components/ui/loading-animation';

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
      dispatch({ type: 'SET_SEARCH_TYPE', payload: activeSearchType });
      
      switch (activeSearchType) {
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

          await performFileSearch(
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
          };
          
          dispatch({ type: 'SET_PARAMS', payload: params });
          
          const results = await HansardAPI.search(params);
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
              response: searchState.results?.TotalContributions || [],
              queryState: {
                searchTerm: searchState.searchParams.searchTerm || '',
                house: searchState.searchParams.house,
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
              results={searchState.results?.Contributions || []}
              isLoading={loading}
              totalResults={searchState.results?.TotalContributions || 0}
              searchParams={searchState.searchParams}
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