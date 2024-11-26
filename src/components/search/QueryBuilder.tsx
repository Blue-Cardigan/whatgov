import { useEffect, useCallback, useReducer, useRef, useState } from 'react';
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
import type { SearchParams } from "@/lib/hansard-api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from '@/hooks/useAuth';
import { Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Crown, Check } from 'lucide-react';

export function QueryBuilder({ 
  searchParams,
  onSearch
}: {
  searchParams: SearchParams;
  onSearch: (params: Partial<SearchParams>) => void;
}) {
  const { isEngagedCitizen } = useAuth();
  const isFirstRender = useRef(true);
  const previousSearchTerm = useRef(searchParams.searchTerm);
  
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

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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
    onSearch({ ...searchParams, ...localParams, searchTerm: queryString });
  }, [state.parts, buildQueryString, localParams, searchParams, onSearch]);

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

  const handleHouseChange = useCallback((house: 'Commons' | 'Lords' | undefined) => {
    handleLocalOptionsChange({ house });
  }, [handleLocalOptionsChange]);

  const handleSubscribe = useCallback(() => {
    // Handle subscription logic here
  }, []);

  return (
    <div className="space-y-4">
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

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden shadow-sm">
            <Button
              variant={localParams.house === 'Commons' ? "default" : "outline"}
              size="sm"
              onClick={() => handleHouseChange('Commons')}
              className={cn(
                "flex-1 py-2 px-4 transition-colors",
                localParams.house === 'Commons' ? "bg-[#006E46] text-white" : "bg-white text-black",
                "hover:bg-[#005a3a] hover:text-white"
              )}
            >
              Commons
            </Button>
            <Button
              variant={localParams.house === 'Lords' ? "default" : "outline"}
              size="sm"
              onClick={() => handleHouseChange('Lords')}
              className={cn(
                "flex-1 py-2 px-4 transition-colors",
                localParams.house === 'Lords' ? "bg-[#9C1A39] text-white" : "bg-white text-black",
                "hover:bg-[#7a142d] hover:text-white"
              )}
            >
              Lords
            </Button>
            <Button
              variant={!localParams.house ? "default" : "outline"}
              size="sm"
              onClick={() => handleHouseChange(undefined)}
              className={cn(
                "flex-1 py-2 px-4 transition-colors",
                !localParams.house ? "bg-primary text-white" : "bg-white text-black",
                "hover:bg-primary-dark hover:text-white"
              )}
            >
              Both
            </Button>
          </div>
        </div>

        <div className="flex-1" />

        <Button
          size="sm"
          className="h-8 px-4 gap-2 border-l-[6px] transition-colors shadow-sm hover:shadow-md"
          onClick={handleSubmit}
        >
          <SearchIcon className="h-4 w-4" />
          <span>Search</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {searchTypes.map((type) => {
          const isPremiumFeature = ['spokenby', 'debate', 'words'].includes(type.id);
          
          // Skip premium features in the main list
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

        {/* Add single advanced search button if not subscribed */}
        {!isEngagedCitizen && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpgradeDialog(true)}
                  className="h-8 gap-2 border-l-[6px] transition-colors shadow-sm hover:shadow-md opacity-70"
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-xs">Advanced Search</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Subscribe to access advanced search features</p>
                <p className="text-muted-foreground text-sm">
                  Filter by speaker, debate type, and specific words
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle className="text-2xl font-semibold mb-4">
            Upgrade to Engaged Citizen
          </DialogTitle>
          
          <DialogDescription asChild>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Access advanced search capabilities with an Engaged Citizen subscription.
              </p>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      "bg-purple-50 dark:bg-purple-500/10",
                      "text-purple-500"
                    )}>
                      <Crown className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Engaged Citizen</CardTitle>
                      <CardDescription>For engaged citizens who want deeper insights</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">£2.49</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {[
                      "Filter debates by speaker, type, and topic",
                      "See key points from debates (+ comments section)",
                      "Advanced Hansard search capabilities",
                      "Track your MP's votes and speeches",
                      "Access the upcoming Parliamentary schedule",
                      "See how others voted on key issues",
                      "Access your voting analytics",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button 
                    className="w-full" 
                    onClick={handleSubscribe}
                  >
                    Upgrade Now
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setShowUpgradeDialog(false)}
                  >
                    Maybe Later
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
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