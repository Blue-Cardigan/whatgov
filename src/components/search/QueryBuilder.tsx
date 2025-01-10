import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Search as SearchIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { 
  LightbulbIcon, 
  BookOpenIcon, 
  UserIcon,
  FilterIcon
} from 'lucide-react';
import { RefreshCcwIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const searchTypes = [
  { 
    id: 'ai', 
    label: 'AI Assistant', 
    icon: <LightbulbIcon className="h-4 w-4" />,
    description: "Ask questions about parliamentary activity",
    placeholder: "Ask a question about parliamentary activity...",
    examples: [
      "What arguments were given against the Assisted Dying Bill in the House of Lords?",
      "Which MPs think Unions have too much power?",
      "Which Labour MPs want to remove the two child benefit cap?"
    ],
    showFilters: false
  },
  { 
    id: 'hansard', 
    label: 'Hansard', 
    icon: <BookOpenIcon className="h-4 w-4" />,
    description: "Search the official record directly",
    placeholder: "Search for specific words or phrases...",
    showHouse: true, 
    showDate: true,
    showFilters: true
  },
  { 
    id: 'mp', 
    label: 'MP Search', 
    icon: <UserIcon className="h-4 w-4" />,
    description: "Search MP votes and contributions",
    placeholder: "Search for an MP by name...",
    showHouse: false, 
    showDate: true,
    showFilters: true
  }
] as const;

// Add type for search types
type SearchType = typeof searchTypes[number]['id'];

interface QueryBuilderProps {
  searchParams: {
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    house?: 'Commons' | 'Lords';
  };
  onSearch: (params: any) => void;
  searchType: SearchType;
  onSearchTypeChange: (type: SearchType) => void;
  useRecentFiles?: boolean;
  onToggleRecentFiles?: (value: boolean) => void;
}

// Add this helper function at the top level
const getStartOfWeek = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString();
};

export function QueryBuilder({ 
  searchParams, 
  onSearch, 
  searchType,
  onSearchTypeChange,
  useRecentFiles,
  onToggleRecentFiles
}: QueryBuilderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState(searchParams.searchTerm || '');
  const today = new Date().toISOString();

  // Update initialization
  const startOfWeek = getStartOfWeek();
  const [localParams, setLocalParams] = useState({
    startDate: searchParams.startDate || startOfWeek,
    endDate: searchParams.endDate || today,
    house: searchParams.house
  });

  // Update hasCustomDates check
  const [hasCustomDates, setHasCustomDates] = useState(
    searchParams.startDate !== startOfWeek || 
    searchParams.endDate !== today
  );

  const [showFilters, setShowFilters] = useState(false);

  const handleDateChange = (type: 'start' | 'end', date?: Date) => {
    if (date) {
      setHasCustomDates(true);
      setLocalParams(prev => ({
        ...prev,
        [type === 'start' ? 'startDate' : 'endDate']: date.toISOString()
      }));
    }
  };

  // Rename and update reset function
  const resetToCurrentWeek = () => {
    setLocalParams(prev => ({
      ...prev,
      startDate: startOfWeek,
      endDate: today
    }));
    setHasCustomDates(false);
  };

  const handleHouseChange = (house: 'Commons' | 'Lords') => {
    setLocalParams(prev => {
      // If the house is already selected and it's the only one selected,
      // clicking it again will deselect it
      if (prev.house === house) {
        return {
          ...prev,
          house: undefined
        };
      }
      
      // If the other house is selected, clicking this one will select both (undefined)
      if (prev.house && prev.house !== house) {
        return {
          ...prev,
          house: undefined
        };
      }
      
      // If no house is selected, clicking one will select it
      return {
        ...prev,
        house: house
      };
    });
  };

  const handleSubmit = () => {
    
    onSearch({
      searchTerm,
      ...localParams
    });
  };

  const currentSearchType = searchTypes.find(t => t.id === searchType);

  // Get active filters count only for search types that show filters
  const activeFiltersCount = currentSearchType?.showFilters ? [
    localParams.startDate,
    localParams.endDate,
    localParams.house
  ].filter(Boolean).length : 0;

  // Predefined date ranges
  const dateRanges = {
    currentParliament: {
      label: 'Current Parliament',
      startDate: '2024-07-04', // Current parliament start date
      endDate: new Date().toISOString()
    },
    // Can add more predefined ranges here
  } as const;

  const handleDateRangeSelect = (value: string) => {
    if (value === 'custom') {
      return; // Keep current custom dates
    }
    
    const range = dateRanges[value as keyof typeof dateRanges];
    if (range) {
      setLocalParams(prev => ({
        ...prev,
        startDate: range.startDate,
        endDate: range.endDate
      }));
    }
  };

  // Get current date range type
  const getCurrentDateRangeType = () => {
    if (!localParams.startDate || !localParams.endDate) return 'custom';
    
    // Check if dates match any predefined range
    if (localParams.startDate === dateRanges.currentParliament.startDate &&
        localParams.endDate === dateRanges.currentParliament.endDate) {
      return 'currentParliament';
    }
    
    return 'custom';
  };

  return (
    <div className="space-y-4">
      {/* Main Search Section */}
      <div className="space-y-4">
        {/* Search Types */}
        <div className="grid grid-cols-3 gap-2">
          {searchTypes.map((type) => (
            <Button
              key={type.id}
              variant={searchType === type.id ? "default" : "outline"}
              onClick={() => onSearchTypeChange(type.id)}
              className={cn(
                "flex flex-col h-auto py-3 px-4 space-y-1",
                searchType === type.id && "shadow-sm"
              )}
            >
              <div className="flex items-center gap-2">
                {type.icon}
                <span>{type.label}</span>
              </div>
              <span className="text-xs font-normal text-muted-foreground">
                {type.description}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Search Input and Button Group */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder={
                searchTypes.find(t => t.id === searchType)?.placeholder ||
                "Search parliamentary debates..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {searchTypes.find(t => t.id === searchType)?.icon}
            </div>
          </div>
          <Button 
            onClick={handleSubmit}
            className="shrink-0"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Add the toggle for AI search type */}
        {searchType === 'ai' && (
          <div className="flex items-center space-x-2">
            <Switch
              id="recent-files"
              checked={useRecentFiles}
              onCheckedChange={onToggleRecentFiles}
            />
            <Label htmlFor="recent-files" className="text-sm text-muted-foreground">
              {useRecentFiles 
                ? "Searching debates from this week" 
                : "Searching all debates during the current government"}
            </Label>
          </div>
        )}
      </div>

      {/* Example queries for AI search */}
      {searchType === 'ai' && !searchTerm && (
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {searchTypes.find(t => t.id === 'ai')?.examples.map((example, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setSearchTerm(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Only show filters section for search types that support it */}
      {currentSearchType?.showFilters && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                showFilters && "text-foreground"
              )}
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocalParams({
                    startDate: '',
                    endDate: '',
                    house: undefined
                  });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg space-y-4">
              {/* Date Range */}
              {currentSearchType?.showDate && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Date Range</label>
                    {hasCustomDates && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetToCurrentWeek}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCcwIcon className="h-3 w-3 mr-1" />
                        Reset to Current Week
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn(
                            "w-[140px] justify-start",
                            !hasCustomDates && "border-dashed"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {localParams.startDate ? 
                            format(new Date(localParams.startDate), "d MMM yyyy") : 
                            "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-2 border-b">
                          <p className="text-sm text-muted-foreground">
                            Current Parliament began on 4 July 2024
                          </p>
                        </div>
                        <CalendarComponent
                          mode="single"
                          selected={localParams.startDate ? new Date(localParams.startDate) : undefined}
                          onSelect={(date) => handleDateChange('start', date)}
                          disabled={(date) => 
                            localParams.endDate ? date > new Date(localParams.endDate) : false
                          }
                          defaultMonth={new Date(startOfWeek)}
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
                            "w-[140px] justify-start",
                            !hasCustomDates && "border-dashed"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {localParams.endDate ? 
                            format(new Date(localParams.endDate), "d MMM yyyy") : 
                            "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={localParams.endDate ? new Date(localParams.endDate) : undefined}
                          onSelect={(date) => handleDateChange('end', date)}
                          disabled={(date) => 
                            localParams.startDate ? date < new Date(localParams.startDate) : false
                          }
                          defaultMonth={new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {!hasCustomDates && (
                    <p className="text-sm text-muted-foreground">
                      Showing results from the current week
                    </p>
                  )}
                </div>
              )}

              {/* House Selector */}
              {currentSearchType?.showHouse && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">House</label>
                  <div className="flex gap-2">
                    <Button
                      variant={localParams.house === 'Commons' || !localParams.house ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleHouseChange('Commons')}
                      className={cn(
                        "flex-1",
                        localParams.house === 'Commons' && "bg-[#006E46] text-white hover:bg-[#005538]",
                        !localParams.house && "bg-[#006E46] text-white hover:bg-[#005538] opacity-90"
                      )}
                    >
                      Commons
                    </Button>
                    <Button
                      variant={localParams.house === 'Lords' || !localParams.house ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleHouseChange('Lords')}
                      className={cn(
                        "flex-1",
                        localParams.house === 'Lords' && "bg-[#9C1A39] text-white hover:bg-[#8B1733]",
                        !localParams.house && "bg-[#9C1A39] text-white hover:bg-[#8B1733] opacity-90"
                      )}
                    >
                      Lords
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 