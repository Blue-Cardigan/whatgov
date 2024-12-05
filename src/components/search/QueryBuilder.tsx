import { useEffect, useCallback, useReducer, useRef, useState, useMemo } from 'react';
import { QueryPartInput } from './QueryPartInput';
import type { SearchType } from './QueryPartInput';
import { Button } from '@/components/ui/button';
import { SearchIcon } from 'lucide-react';
import { queryReducer, QueryPart } from './queryReducer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { searchTypes } from "./config";
import type { SearchParams } from "@/types/search";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';
import { LightbulbIcon } from 'lucide-react';
import { useEngagement } from '@/hooks/useEngagement';
import { useRouter } from 'next/navigation';

interface QueryBuilderProps {
  searchParams: SearchParams;
  onSearch: (params: Partial<SearchParams>) => void;
  mode: 'hansard' | 'mp';
}

export function QueryBuilder({ 
  searchParams,
  onSearch,
  mode
}: QueryBuilderProps) {
  const { isEngagedCitizen, user } = useAuth();
  const { getRemainingAISearches } = useEngagement();
  const isFirstRender = useRef(true);
  const previousSearchTerm = useRef(searchParams.searchTerm);
  const router = useRouter();
  
  const [state, dispatch] = useReducer(queryReducer, {
    parts: searchParams.searchTerm ? parseInitialValue(searchParams.searchTerm) : [{ type: 'text', value: '', isValid: true }],
    focusedIndex: null
  });

  // Local state for date selections and house toggle
  const [localParams, setLocalParams] = useState<Partial<SearchParams>>({
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    house: searchParams.house,
  });

  const [enableAI, setEnableAI] = useState(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (searchParams.searchTerm !== previousSearchTerm.current) {
      previousSearchTerm.current = searchParams.searchTerm;
      
      if (!searchParams.searchTerm) {
        dispatch({ type: 'SET_PARTS', payload: [{ type: 'text', value: '', isValid: true }] });
      } else {
        dispatch({ type: 'SET_PARTS', payload: parseInitialValue(searchParams.searchTerm) });
      }
    }
  }, [searchParams.searchTerm]);

  const handleLocalOptionsChange = useCallback((updates: Partial<SearchParams>) => {
    setLocalParams(prev => ({ ...prev, ...updates }));
  }, []);

  const buildQueryString = useCallback((parts: QueryPart[]): string => {
    return parts
      .filter(part => part.value.trim() && part.isValid)
      .map(part => {
        const value = part.value.trim();
        switch (part.type) {
          case 'spokenby':
            return `spokenby:"${value}"`;
          case 'debate':
            return `debate:"${value}"`;
          case 'words':
            return `words:"${value}"`;
          default:
            return value.includes(' ') ? `"${value}"` : value;
        }
      })
      .join(' AND ');
  }, []);

  const handleSubmit = useCallback(() => {
    const queryString = buildQueryString(state.parts);
    onSearch({ 
      ...searchParams, 
      ...localParams, 
      searchTerm: queryString,
      enableAI: enableAI && user !== null
    });
  }, [state.parts, buildQueryString, localParams, searchParams, onSearch, enableAI, user]);

  const handleAddPart = useCallback((type: QueryPart['type']) => {
    dispatch({ type: 'ADD_PART', payload: type });
  }, []);

  const handleUpdatePart = useCallback((index: number, value: string) => {
    dispatch({ type: 'UPDATE_PART', payload: { index, value } });
  }, []);

  const handleRemovePart = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_PART', payload: index });
  }, []);

  const handleTypeChange = useCallback((index: number, newType: QueryPart['type']) => {
    dispatch({ 
      type: 'CHANGE_PART_TYPE', 
      payload: { index, partType: newType } 
    });
  }, []);

  const handleDateChange = useCallback((type: 'start' | 'end', date: Date | undefined) => {
    handleLocalOptionsChange({ [type === 'start' ? 'startDate' : 'endDate']: date ? date.toISOString().split('T')[0] : undefined });
  }, [handleLocalOptionsChange]);

  const handleHouseChange = useCallback((house: 'Commons' | 'Lords') => {
    const currentHouses = localParams.house?.split(',').filter(Boolean) || [];
    let newHouses: string[];
    
    if (currentHouses.includes(house)) {
      // Remove the house if it's already selected
      newHouses = currentHouses.filter(h => h !== house);
    } else {
      // Add the house if it's not selected
      newHouses = [...currentHouses, house];
    }
    
    // Send the new houses array, even if empty
    handleLocalOptionsChange({ 
      house: newHouses.length > 0 ? newHouses.join(',') as 'Commons' | 'Lords' : undefined 
    });
  }, [localParams.house, handleLocalOptionsChange]);

  // Helper function to check if a house is selected
  const isHouseSelected = (house: string) => {
    if (!localParams.house) {
      // If no house is specified, neither is selected
      return false;
    }
    return localParams.house.includes(house);
  };

  // Add new useEffect for keyboard listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleSubmit]);

  // Modify the search types based on mode
  const currentSearchTypes = useMemo(() => {
    if (mode === 'mp') {
      return [
        {
          id: 'text',
          label: 'MP Name',
          icon: <SearchIcon className="h-4 w-4" />,
          tooltip: 'Enter the MP name to search their statements (e.g., "Rishi Sunak" or "Starmer")'
        }
      ];
    }
    return searchTypes;
  }, [mode]);

  // Modify the query builder UI based on mode
  const renderQueryInputs = () => {
    if (mode === 'mp') {
      return (
        <QueryPartInput
          part={state.parts[0]}
          searchType={currentSearchTypes[0] as SearchType}
          index={0}
          isFocused={state.focusedIndex === 0}
          onFocus={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: 0 })}
          onBlur={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: null })}
          onUpdate={handleUpdatePart}
          onRemove={() => {}}
          onTypeChange={() => {}}
          showRemove={false}
        />
      );
    }

    return (
      <div className="space-y-2">
        {state.parts.map((part, index) => (
          <QueryPartInput
            key={`${part.type}-${index}`}
            part={part}
            searchType={searchTypes.find(t => t.id === part.type) as SearchType | undefined}
            index={index}
            isFocused={state.focusedIndex === index}
            onFocus={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: index })}
            onBlur={() => dispatch({ type: 'SET_FOCUSED_INDEX', payload: null })}
            onUpdate={handleUpdatePart}
            onRemove={handleRemovePart}
            onTypeChange={handleTypeChange}
            showRemove={state.parts.length > 1}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {renderQueryInputs()}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {mode === 'hansard' && (
          <>
            {/* Date Range Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 gap-2",
                      localParams.startDate && "text-primary",
                      "border-l-[6px] transition-colors shadow-sm hover:shadow-md"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {localParams.startDate ? (
                      format(new Date(localParams.startDate), "d MMM yyyy")
                    ) : (
                      <span className="text-xs">Start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={localParams.startDate ? new Date(localParams.startDate) : undefined}
                    onSelect={(date) => handleDateChange('start', date || undefined)}
                    initialFocus
                    disabled={(date) => 
                      localParams.endDate ? date > new Date(localParams.endDate) : false
                    }
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 gap-2",
                      localParams.endDate && "text-primary",
                      "border-l-[6px] transition-colors shadow-sm hover:shadow-md"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {localParams.endDate ? (
                      format(new Date(localParams.endDate), "d MMM yyyy")
                    ) : (
                      <span className="text-xs">End date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={localParams.endDate ? new Date(localParams.endDate) : undefined}
                    onSelect={(date) => handleDateChange('end', date || undefined)}
                    initialFocus
                    disabled={(date) => 
                      localParams.startDate ? date < new Date(localParams.startDate) : false
                    }
                  />
                </PopoverContent>
              </Popover>

              {(localParams.startDate || localParams.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleLocalOptionsChange({ startDate: undefined, endDate: undefined })}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear date range</span>
                </Button>
              )}
            </div>

            {/* House Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex gap-2">
                <Button
                  variant={isHouseSelected('Commons') ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleHouseChange('Commons')}
                  className={cn(
                    "transition-colors",
                    isHouseSelected('Commons') ? "bg-[#006E46] text-white" : "bg-white text-black",
                    "hover:bg-[#005a3a] hover:text-white"
                  )}
                >
                  Commons
                </Button>
                <Button
                  variant={isHouseSelected('Lords') ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleHouseChange('Lords')}
                  className={cn(
                    "transition-colors",
                    isHouseSelected('Lords') ? "bg-[#9C1A39] text-white" : "bg-white text-black",
                    "hover:bg-[#7a142d] hover:text-white"
                  )}
                >
                  Lords
                </Button>
              </div>
            </div>
          </>
        )}

        <Button
          size="sm"
          className="h-8 px-4 gap-2 border-l-[6px] transition-colors shadow-sm hover:shadow-md w-full sm:w-auto sm:ml-auto"
          onClick={handleSubmit}
        >
          <SearchIcon className="h-4 w-4" />
          <span>Search</span>
        </Button>
      </div>

      {mode === 'hansard' && (
        <>
          {/* Search Type Buttons */}
          <div className="flex flex-wrap gap-2">
            {currentSearchTypes.map((type) => {
              const isPremiumFeature = ['spokenby', 'debate', 'words'].includes(type.id);
              
              if (isPremiumFeature && !isEngagedCitizen) {
                return null;
              }

              return (
                <TooltipProvider key={type.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={state.parts.some(p => p.type === type.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAddPart(type.id as QueryPart['type'])}
                        className="h-8 gap-2 border-l-[6px] transition-colors shadow-sm hover:shadow-md"
                      >
                        {type.icon}
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{type.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}

            {/* Advanced Search Button */}
            {!isEngagedCitizen && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!user) {
                        router.push('/login');
                      }
                    }}
                    className="h-8 gap-2 border-l-[6px] transition-colors shadow-sm hover:shadow-md opacity-70"
                  >
                    <Lock className="h-4 w-4" />
                    <span className="text-xs">Advanced Search</span>
                  </Button>
                </PopoverTrigger>
                {user && (
                  <PopoverContent className="w-auto" align="start">
                    <div className="flex items-center gap-2 text-sm">
                      <span>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium"
                          onClick={() => router.push('/pricing')}
                        >
                          Upgrade
                        </Button>
                        {" "}to use this feature
                      </span>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            )}
          </div>

          {/* AI Search Section */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <LightbulbIcon className="h-4 w-4 text-primary" />
                AI-Enhanced Search Results
              </h3>
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {getRemainingAISearches() === Infinity ? (
                      "Unlimited searches"
                    ) : (
                      `${getRemainingAISearches()} searches remaining`
                    )}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={enableAI ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (getRemainingAISearches() > 0) {
                            setEnableAI(!enableAI);
                          }
                        }}
                        className={cn(
                          "gap-2",
                          enableAI && getRemainingAISearches() <= 0 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <LightbulbIcon className="h-4 w-4" />
                        {enableAI ? "AI Enhanced" : "Enable AI"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto" align="start">
                      <div className="flex items-center gap-2 text-sm">
                        <span>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium"
                            onClick={() => router.push('/pricing')}
                          >
                            Upgrade
                          </Button>
                          {" "}for unlimited
                        </span>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="text-xs"
                >
                  Sign in to enable
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {enableAI && user ? (
                "AI will analyze search results to provide clear summaries and key points from parliamentary debates."
              ) : user ? (
                "Enable AI analysis to get summaries and key points from parliamentary debates."
              ) : (
                "Get clear summaries and key points from parliamentary debates, making Hansard more accessible than ever. Sign in to access this feature."
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function parseInitialValue(value: string): QueryPart[] {
  if (!value) return [];

  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return matches.map(match => {
    if (match.startsWith('spokenby:')) {
      return { 
        type: 'spokenby',
        value: match.slice(9).replace(/"/g, ''),
        isValid: true 
      };
    } else {
      return { 
        type: 'text',
        value: match.replace(/"/g, ''),
        isValid: true 
      };
    }
  });
}