"use client";

import { useState, useCallback } from 'react';
import { useSearch } from '@/contexts/SearchContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/hooks/useEngagement';
import { HansardAPI } from '@/lib/search-api';
import { QueryBuilder } from './QueryBuilder';
import { DateRange, SearchResults } from './Hansard/SearchResults';
import { StreamedResponse } from './Assistant/StreamedResponse';
import { MPProfileCard } from '@/components/search/MPProfile/MPProfileCard';
import { MPLinks } from '@/components/search/MPProfile/MPLinks';
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
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Check } from "lucide-react";

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
          const mpData = await getMPData(searchParams.searchTerm);
          if (mpData) {
            const { data: keyPoints } = await getMPKeyPointsByName(mpData.member_id);
            dispatch({ 
              type: 'SET_MP_SEARCH', 
              payload: { 
                query: searchParams.searchTerm,
                mpId: mpData.member_id.toString(),
                keywords: []
              }
            });
            setMPData(mpData);
            setKeyPoints(keyPoints);
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
              response: {
                TotalMembers: searchState.results?.Members?.length || 0,
                TotalContributions: searchState.results?.Contributions?.length || 0,
                TotalWrittenStatements: searchState.results?.WrittenStatements?.length || 0,
                TotalWrittenAnswers: searchState.results?.WrittenAnswers?.length || 0,
                TotalCorrections: searchState.results?.Corrections?.length || 0,
                TotalPetitions: searchState.results?.Petitions?.length || 0,
                TotalDebates: searchState.results?.Debates?.length || 0,
                TotalCommittees: searchState.results?.Committees?.length || 0,
                TotalDivisions: searchState.results?.Divisions?.length || 0,
                SearchTerms: searchState.results?.SearchTerms || [],
                Contributions: searchState.results?.Contributions || [],
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
        return mpData && (
          <div className="space-y-6">
            <MPProfileCard mpData={mpData} />
            <MPLinks mpData={mpData} />
            {isProfessional || isEngagedCitizen ? (
              <Card className="p-6 bg-muted/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">Coming Soon</h3>
                  </div>
                  <p className="text-muted-foreground">
                    We're working on analyzing parliamentary data to provide detailed insights into MP activities and positions. Check back soon!
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Track MP voting patterns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">View key debate contributions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Analyze position changes over time</span>
                    </li>
                  </ul>
                </div>
              </Card>
            ) : (
              <SubscriptionCTA
                title="Upgrade to track MP activity"
                description="Get detailed insights into MPs' parliamentary contributions and positions."
                features={[
                  "View key points for any MP",
                  "Track MP activities and votes",
                  "Compare MPs' positions on issues"
                ]}
              />
            )}
          </div>
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