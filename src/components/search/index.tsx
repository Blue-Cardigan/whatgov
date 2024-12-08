"use client";

import { useState, useCallback, useEffect } from 'react';
import { SearchResults } from "./SearchResults";
import { QueryBuilder } from './QueryBuilder';
import { HansardAPI } from '@/lib/search-api';
import type { SearchParams } from '@/types/search';
import type { SearchFilterParams } from '@/types/assistant';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { useAssistant } from '@/hooks/useAssistant';
import { StreamedResponse } from './Assistant/StreamedResponse';
import { useSearch } from '@/contexts/SearchContext';
import { LightbulbIcon } from 'lucide-react';
import { AssistantBuilder } from './Assistant/AssistantBuilder';
import { promptTemplates } from '@/lib/assistant-prompts';
import { UpgradePopover } from "@/components/ui/upgrade-popover";
import { InfoIcon } from 'lucide-react';

const PAGE_SIZE = 10;

export function Search() {
  const { state, dispatch } = useSearch();
  const { user, isEngagedCitizen, isPremium, loading: authLoading } = useAuth();
  const { 
    recordAISearch, 
    hasReachedAISearchLimit, 
    getRemainingAISearches 
  } = useEngagement();
  const { toast } = useToast();
  const { 
    performFileSearch, 
    isLoading: aiLoading
  } = useAssistant();

  // Set initial tab based on user's access level and search limit
  const [activeTab, setActiveTab] = useState('hansard');

  // Update active tab once auth state is confirmed
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        setActiveTab(state.aiSearch.query ? 'ai' : 'hansard');
      } else {
        setActiveTab('hansard');
      }
    }
  }, [user, authLoading, state.aiSearch.query]);

  // Update to use new state structure
  const [fileQuery, setFileQuery] = useState(state.aiSearch.query);

  // Add effect to sync fileQuery with context
  useEffect(() => {
    setFileQuery(state.aiSearch.query);
  }, [state.aiSearch.query]);

  const performSearch = useCallback(async (newParams?: Partial<SearchParams>, loadMore = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const enableAI = user?.id && !hasReachedAISearchLimit();
      
      const params: SearchParams = {
        ...state.searchParams,
        ...newParams,
        skip: loadMore ? (state.searchParams.skip || 0) + PAGE_SIZE : 0,
        take: PAGE_SIZE,
        enableAI: enableAI || undefined,
      };

      const response = await HansardAPI.search(params);
      
      if (!loadMore && enableAI && params.enableAI) {
        await recordAISearch();
      }

      dispatch({ type: 'SET_PARAMS', payload: params });
      dispatch({ 
        type: loadMore ? 'APPEND_RESULTS' : 'SET_RESULTS', 
        payload: response 
      });
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.searchParams, user, hasReachedAISearchLimit, recordAISearch, toast, dispatch]);

  const handleSearch = useCallback((params: Partial<SearchParams>) => 
    performSearch(params), [performSearch]);

  const handleFileQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileQuery(event.target.value);
  };

  const getSearchLimitMessage = () => {
    if (authLoading) {
      return "Loading...";
    }
    if (!user) {
      return "Sign in to access the AI ResearchAssistant";
    }
    
    const remaining = getRemainingAISearches();
    
    if (isPremium) {
      return "Unlimited AI Assistant searches available";
    }
    
    if (isEngagedCitizen) {
      return `${remaining} AI ${remaining === 1 ? 'search' : 'searches'} remaining this week`;
    }
    
    return `${remaining} AI ${remaining === 1 ? 'search' : 'searches'} remaining this month`;
  };

  const [selectedOpenAIAssistantId, setSelectedOpenAIAssistantId] = useState<string | null>(null);

  const handleAssistantChange = (_assistantId: string | null, openaiAssistantId: string | null) => {
    setSelectedOpenAIAssistantId(openaiAssistantId);
  };

  const handleFileSearch = async () => {
    if (!fileQuery.trim()) return;
    
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ 
      type: 'SET_AI_SEARCH', 
      payload: { 
        query: fileQuery,
        streamingText: '',
        citations: []
      }
    });
    
    try {
      await performFileSearch(
        fileQuery, 
        selectedOpenAIAssistantId,
        (streamingText, citations) => {
          dispatch({ 
            type: 'SET_AI_SEARCH', 
            payload: {
              query: fileQuery,
              streamingText,
              citations
            }
          });
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Search failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: 'SET_AI_LOADING', payload: false });
    }
  };

  const [isAssistantBuilderOpen, setIsAssistantBuilderOpen] = useState(false);

  const handleAssistantCreate = async (assistant: {
    name: string;
    description: string;
    promptType: keyof typeof promptTemplates;
    filters: SearchFilterParams;
    keywords: string[];
    fileIds: string[];
  }) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/assistant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...assistant,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assistant');
      }
      
      toast({
        title: "Assistant Building",
        description: "Your new assistant is being created",
      });

      setIsAssistantBuilderOpen(false);
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Error",
        description: "Failed to create assistant. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mt-4 mb-4">
          <TabsTrigger 
            value="ai" 
            disabled={authLoading || !user}
          >
            AI Research Assistant
          </TabsTrigger>
          <TabsTrigger value="hansard">Hansard Search</TabsTrigger>
        </TabsList>

        {activeTab === 'ai' && (
          <div className="mb-4 text-sm text-muted-foreground text-center flex items-center justify-center">
            <LightbulbIcon className="w-4 h-4 mr-2 inline" />
            <span>{getSearchLimitMessage()}</span>
          </div>
        )}

        <TabsContent value="hansard">
          <h1 className="text-2xl font-bold mt-4">Search Hansard</h1>
          <p className="text-muted-foreground mb-4">The Official Parliamentary Record</p>
          <div className="mb-8 lg:mb-12">
            <QueryBuilder
              searchParams={state.searchParams}
              onSearch={handleSearch}
              mode="hansard"
            />
          </div>

          <SearchResults
            results={state.results?.Contributions || []}
            isLoading={state.isLoading}
            totalResults={state.results?.TotalContributions || 0}
            searchParams={state.searchParams}
            onSearch={handleSearch}
            onLoadMore={() => performSearch(undefined, true)}
            hasMore={Boolean(state.results?.TotalContributions && 
              state.results.Contributions.length < state.results.TotalContributions)}
            aiContent={state.results?.aiContent}
          />
        </TabsContent>

        <TabsContent value="ai">
          <h1 className="text-2xl font-bold mt-4">AI Research Assistant</h1>
          <p className="text-muted-foreground mb-4">
            Search through parliamentary records with AI assistance
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {!isPremium && (
                  <>
                    <span>{getRemainingAISearches()} searches remaining</span>
                    <UpgradePopover feature="ai-search">
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <InfoIcon className="h-4 w-4" />
                      </Button>
                    </UpgradePopover>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Enter your search query..."
                  value={fileQuery}
                  onChange={handleFileQueryChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleFileSearch();
                    }
                  }}
                />
              </div>
              {hasReachedAISearchLimit() ? (
                <UpgradePopover feature="ai-search">
                  <Button>
                    Search
                  </Button>
                </UpgradePopover>
              ) : (
                <Button 
                  onClick={handleFileSearch} 
                  disabled={aiLoading}
                >
                  {aiLoading ? 'Searching...' : 'Search'}
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="p-4">
                <StreamedResponse 
                  streamingText={state.aiSearch.streamingText}
                  citations={state.aiSearch.citations}
                  isLoading={state.aiSearch.isLoading}
                  query={state.aiSearch.query}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <AssistantBuilder
        isOpen={isAssistantBuilderOpen}
        setIsOpen={setIsAssistantBuilderOpen}
        onAssistantCreate={handleAssistantCreate}
      />
    </>
  );
}