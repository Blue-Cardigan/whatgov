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
import { LightbulbIcon, PlusCircleIcon, UserCircle2Icon } from 'lucide-react';
import { AssistantBuilder } from './Assistant/AssistantBuilder';
import { promptTemplates } from '@/lib/assistant-prompts';
import { UpgradePopover } from "@/components/ui/upgrade-popover";
import { AssistantSelect } from '@/components/search/Assistant/AssistantSelect';
import { SaveSearchButton } from './Assistant/SaveSearchButton';

const PAGE_SIZE = 10;

interface SearchProps {
  initialTab?: 'ai' | 'hansard';
}

export function Search({ initialTab }: SearchProps) {
  const { state, dispatch } = useSearch();
  const { user, isEngagedCitizen, isPremium, loading: authLoading } = useAuth();
  const { 
    recordResearchSearch, 
    hasReachedResearchSearchLimit, 
    getRemainingResearchSearches 
  } = useEngagement();
  const { toast } = useToast();
  const { 
    performFileSearch, 
    isLoading: aiLoading
  } = useAssistant();

  // Update the tab handling to accept an initial tab from URL or saved search
  const [activeTab, setActiveTab] = useState<'ai' | 'hansard'>(
    initialTab || state.searchType || 'ai'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      dispatch({ type: 'SET_SEARCH_TYPE', payload: initialTab });
    }
  }, [initialTab, dispatch]);

  // Create a handler function for tab changes
  const handleTabChange = (value: string) => {
    if (value === 'ai' || value === 'hansard') {
      setActiveTab(value);
      dispatch({ type: 'SET_SEARCH_TYPE', payload: value });
      
      // Clear the other search type's state when switching tabs
      if (value === 'ai') {
        dispatch({ type: 'SET_PARAMS', payload: { 
          searchTerm: '',
          skip: 0,
          take: PAGE_SIZE,
          orderBy: 'SittingDateDesc'
        }});
        dispatch({ 
          type: 'SET_RESULTS', 
          payload: {
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
            Committees: [],
          }
        });
      } else {
        dispatch({ type: 'CLEAR_AI_SEARCH' });
      }
    }
  };

  // Effect to handle loading saved search state
  useEffect(() => {
    // Get search state from URL or sessionStorage
    const savedState = sessionStorage.getItem('searchState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      
      // Set the correct tab based on saved search type
      if (parsed.searchType) {
        setActiveTab(parsed.searchType);
        dispatch({ type: 'SET_SEARCH_TYPE', payload: parsed.searchType });
      }
      
      // Load the appropriate state based on search type
      if (parsed.searchType === 'hansard') {
        // Load Hansard search state
        dispatch({ type: 'SET_PARAMS', payload: parsed.searchParams });
        dispatch({ type: 'SET_RESULTS', payload: parsed.results });
      } else if (parsed.searchType === 'ai') {
        // Load AI search state
        dispatch({ 
          type: 'SET_AI_SEARCH', 
          payload: {
            query: parsed.aiSearch.query,
            streamingText: parsed.aiSearch.streamingText,
            citations: parsed.aiSearch.citations
          }
        });
      }
    }
  }, [dispatch]);

  // Update to use new state structure
  const [fileQuery, setFileQuery] = useState(state.aiSearch.query);

  // Add effect to sync fileQuery with context
  useEffect(() => {
    setFileQuery(state.aiSearch.query);
  }, [state.aiSearch.query]);

  const performSearch = useCallback(async (newParams?: Partial<SearchParams>, loadMore = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const enableAI = user?.id && !hasReachedResearchSearchLimit();
      
      const params: SearchParams = {
        ...state.searchParams,
        ...newParams,
        skip: loadMore ? (state.searchParams.skip || 0) + PAGE_SIZE : 0,
        take: PAGE_SIZE,
        enableAI: enableAI || undefined,
      };

      const response = await HansardAPI.search(params);
      
      if (!loadMore && enableAI && params.enableAI) {
        await recordResearchSearch();
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
  }, [state.searchParams, user, hasReachedResearchSearchLimit, recordResearchSearch, toast, dispatch]);

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
    
    const remaining = getRemainingResearchSearches();
    
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

  const handleFileSearch = useCallback(async (overrideQuery?: string) => {
    const queryToUse = overrideQuery || fileQuery;
    if (!queryToUse.trim()) return;
    
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ 
      type: 'SET_AI_SEARCH', 
      payload: { 
        query: queryToUse,
        streamingText: '',
        citations: []
      }
    });
    
    try {
      await performFileSearch(
        queryToUse, 
        selectedOpenAIAssistantId,
        (streamingText, citations) => {
          dispatch({ 
            type: 'SET_AI_SEARCH', 
            payload: {
              query: queryToUse,
              streamingText,
              citations: citations.map(citation => ({
                index: citation.indexOf(queryToUse),
                url: citation
              }))
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
  }, [fileQuery, selectedOpenAIAssistantId, performFileSearch, dispatch, toast]);

  useEffect(() => {
    const initializeFromSavedState = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shouldExecute = searchParams.get('execute') === 'true';
      const savedState = sessionStorage.getItem('searchState');

      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Set the correct tab based on saved search type
        if (parsed.searchType) {
          setActiveTab(parsed.searchType);
          dispatch({ type: 'SET_SEARCH_TYPE', payload: parsed.searchType });
        }
        
        if (shouldExecute) {
          if (parsed.searchType === 'ai' && parsed.aiSearch?.query) {
            // Set the query in state first
            setFileQuery(parsed.aiSearch.query);
            await handleFileSearch(parsed.aiSearch.query);
          } else if (parsed.searchType === 'hansard' && parsed.searchParams) {
            // Execute Hansard search with saved params
            await performSearch(parsed.searchParams);
          }

          // Clean up the URL
          const newUrl = window.location.pathname + '?tab=' + parsed.searchType;
          window.history.replaceState({}, '', newUrl);
          
          // Clear the saved state after execution
          sessionStorage.removeItem('searchState');
        } else {
          // Just load the saved state without executing
          if (parsed.searchType === 'hansard') {
            dispatch({ type: 'SET_PARAMS', payload: parsed.searchParams });
            dispatch({ type: 'SET_RESULTS', payload: parsed.results });
          } else if (parsed.searchType === 'ai') {
            setFileQuery(parsed.aiSearch.query);
            dispatch({ 
              type: 'SET_AI_SEARCH', 
              payload: {
                query: parsed.aiSearch.query,
                streamingText: parsed.aiSearch.streamingText,
                citations: parsed.aiSearch.citations
              }
            });
          }
        }
      }
    };

    initializeFromSavedState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array with ESLint disable comment

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
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mt-4 mb-4">
          <TabsTrigger value="ai">
            AI Research Assistant
          </TabsTrigger>
          <TabsTrigger value="hansard">
            Hansard Searchπ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          {!user ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Sign in to access the AI Research Assistant</h2>
              <p className="text-muted-foreground mb-4">
                Create an account or sign in to start using AI-powered search
              </p>
              {/* You can add a sign-in button here if desired */}
            </div>
          ) : hasReachedResearchSearchLimit() ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Search limit reached</h2>
              <p className="text-muted-foreground mb-4">
                {isEngagedCitizen 
                  ? "You've reached your weekly search limit" 
                  : "You've reached your monthly search limit"}
              </p>
              <UpgradePopover feature="ai-search">
                <Button>Upgrade for unlimited searches</Button>
              </UpgradePopover>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold mt-4">AI Research Assistant</h1>
                  <p className="text-muted-foreground">
                    Search through parliamentary records with AI assistance
                  </p>
                </div>
                <div className="flex gap-2 items-start mt-4">
                  {/* Assistant Select with icon */}
                  {isPremium ? (
                    <AssistantSelect 
                      onAssistantChange={handleAssistantChange}
                    />
                  ) : (
                    <UpgradePopover feature="assistant">
                      <Button variant="outline" size="icon">
                        <UserCircle2Icon className="h-4 w-4" />
                      </Button>
                    </UpgradePopover>
                  )}

                  {/* Create Assistant with icon */}
                  {isPremium ? (
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAssistantBuilderOpen(true)}
                    >
                      <PlusCircleIcon className="h-4 w-4" />
                    </Button>
                  ) : (
                    <UpgradePopover feature="assistant">
                      <Button variant="outline" size="icon">
                        <PlusCircleIcon className="h-4 w-4" />
                      </Button>
                    </UpgradePopover>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {!isPremium && (
                      <>
                        <UpgradePopover feature="ai-search">
                          <Button variant="ghost" size="sm" className="h-6 pl-2 pr-0">
                            <LightbulbIcon className="h-4 w-4" />
                          </Button>
                        </UpgradePopover>
                        <span>{getSearchLimitMessage()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Search input - now without the assistant controls */}
                  <div className="flex-grow">
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

                  {/* Search button */}
                  {hasReachedResearchSearchLimit() ? (
                    <UpgradePopover feature="ai-search">
                      <Button>
                        Search
                      </Button>
                    </UpgradePopover>
                  ) : (
                    <Button 
                      onClick={() => handleFileSearch()} 
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
                      citations={state.aiSearch.citations.map(citation => citation.url)}
                      isLoading={state.aiSearch.isLoading}
                      query={state.aiSearch.query}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <SaveSearchButton 
            aiSearch={{
              query: state.aiSearch.query,
              streamingText: state.aiSearch.streamingText,
              citations: state.aiSearch.citations
            }}
            searchType="ai"
            className="mt-4"
          />
        </TabsContent>

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

          <SaveSearchButton 
            searchParams={{
              searchTerm: state.searchParams.searchTerm || '',
              startDate: state.searchParams.startDate,
              endDate: state.searchParams.endDate,
              house: state.searchParams.house || 'Commons',
              enableAI: state.searchParams.enableAI,
              skip: state.searchParams.skip,
              take: state.searchParams.take,
              orderBy: state.searchParams.orderBy
            }}
            results={state.results}
            searchType="hansard"
            className="mt-4"
          />
        </TabsContent>
      </Tabs>
      
      <AssistantBuilder
        isOpen={isAssistantBuilderOpen}
        setIsOpen={setIsAssistantBuilderOpen}
        onAssistantCreate={handleAssistantCreate}
        mode="create"
      />
    </>
  );
}