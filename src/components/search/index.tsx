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

const PAGE_SIZE = 10;

export function Search({ initialTab = 'ai' }: { initialTab?: 'ai' | 'hansard' | 'mp' }) {
  const { state, dispatch } = useSearch();
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

  const [streamingState, setStreamingState] = useState({
    text: '',
    citations: [] as Citation[],
    isComplete: false
  });

  const handleStreamingUpdate = useCallback((text: string, citations: Citation[]) => {
    setStreamingState(prev => ({
      ...prev,
      text,
      citations,
      isComplete: false
    }));
  }, []);

  const handleStreamingComplete = useCallback(() => {
    setStreamingState(prev => ({
      ...prev,
      isComplete: true
    }));
  }, []);

  const performSearch = useCallback(async (searchParams: any) => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeSearchType) {
        case 'ai':
          // Reset streaming state
          setStreamingState({
            text: '',
            citations: [],
            isComplete: false
          });

          await performFileSearch(
            searchParams.searchTerm,
            null, // assistant ID if needed
            handleStreamingUpdate,
            handleStreamingComplete
          );
          break;

        case 'hansard':
          dispatch({ type: 'SET_LOADING', payload: true });
          const response = await HansardAPI.search({
            ...searchParams,
            skip: 0,
            take: PAGE_SIZE,
          });
          
          if (user?.id) {
            await recordResearchSearch();
          }

          dispatch({ type: 'SET_PARAMS', payload: searchParams });
          dispatch({ type: 'SET_RESULTS', payload: response });
          break;

        case 'mp':
          const mpData = await getMPData(searchParams.searchTerm);
          
          if (!mpData) {
            setError(`No MP found matching "${searchParams.searchTerm}"`);
            setMPData(null);
            setKeyPoints([]);
            setTopics([]);
            return;
          }

          setMPData(mpData);
          
          if (isProfessional) {
            const { data: points } = await getMPKeyPointsByName(mpData.member_id);
            
            if (points) {
              setKeyPoints(points);
              
              const topicsMap = new Map<string, AiTopic>();
              let mentionsCount = 0;
              
              points.forEach(point => {
                mentionsCount++;
                if (Array.isArray(point.ai_topics)) {
                  point.ai_topics.forEach(topic => {
                    // Process topics logic
                  });
                }
              });

              setTopics(Array.from(topicsMap.values()));
              setTotalMentions(mentionsCount);
            }
          }
          break;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSearchType, performFileSearch, handleStreamingUpdate, handleStreamingComplete]);

  const handleSearchTypeChange = (type: 'ai' | 'hansard' | 'mp') => {
    setActiveSearchType(type);
    dispatch({ type: 'CLEAR_RESULTS' });
    setMPData(null);
    setKeyPoints([]);
    setTopics([]);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 py-4 border-b">
        <QueryBuilder
          searchParams={{
            searchTerm: state.searchParams.searchTerm || '',
            startDate: state.searchParams.startDate,
            endDate: state.searchParams.endDate,
            house: state.searchParams.house
          }}
          onSearch={performSearch}
          searchType={activeSearchType}
          onSearchTypeChange={handleSearchTypeChange}
        />
      </div>

      {/* Results Section */}
      <div className="min-h-[300px] pb-8">
        {/* Loading State */}
        {loading && !streamingState.text && (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Searching parliamentary records...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8 space-y-2">
            <p className="font-semibold">Search Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results Content */}
        {!loading && !error && (
          <div className="space-y-6">
            {activeSearchType === 'ai' && (
              <StreamedResponse
                streamingText={streamingState.text}
                citations={streamingState.citations}
                isLoading={!streamingState.isComplete}
                query={state.searchParams.searchTerm || ''}
              />
            )}

            {activeSearchType === 'hansard' && (
              <SearchResults
                results={state.results?.Contributions || []}
                isLoading={state.isLoading}
                totalResults={state.results?.TotalContributions || 0}
                searchParams={state.searchParams}
                onSearch={performSearch}
                onLoadMore={() => {/* Implement load more logic */}}
                hasMore={Boolean(state.results?.TotalContributions && 
                  state.results.Contributions.length < state.results.TotalContributions)}
                aiContent={state.results?.aiContent}
              />
            )}

            {activeSearchType === 'mp' && mpData && (
              <div className="space-y-8">
                <MPProfileCard mpData={mpData} />
                <MPLinks mpData={mpData} />
                
                {isProfessional || isEngagedCitizen ? (
                  <div className="grid gap-8 md:grid-cols-2">
                    {topics.length > 0 && (
                      <MPTopics topics={topics} totalMentions={totalMentions} />
                    )}
                    {keyPoints.length > 0 && (
                      <MPKeyPoints keyPoints={keyPoints} />
                    )}
                  </div>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}