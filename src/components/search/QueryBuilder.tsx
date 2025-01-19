import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { 
  LightbulbIcon, 
  BookOpenIcon, 
  UserIcon,
  Building2,
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEngagement } from '@/hooks/useEngagement';
import { Card } from "@/components/ui/card";
import { eventTypeColors } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

const searchTypes = [
  { 
    id: 'ai', 
    label: 'AI Assistant', 
    icon: <LightbulbIcon className="h-4 w-4" />,
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
    placeholder: "Search for specific words or phrases...",
    showHouse: true, 
    showDate: true,
    showFilters: true
  },
  { 
    id: 'mp', 
    label: 'MP Search', 
    icon: <UserIcon className="h-4 w-4" />,
    placeholder: "Search for an MP by name...",
    showHouse: false, 
    showDate: false,
    showFilters: false
  }
] as const;


interface AdvancedSearchParams {
  text?: string;
  debate?: string;
  spokenBy?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface QueryBuilderProps {
  searchParams: {
    searchTerm: string;
    house?: 'commons' | 'lords' | null;
  };
  onSearch: (params: {
    searchTerm: string;
    house?: 'commons' | 'lords' | null;
  }) => void;
  searchType: 'ai' | 'hansard' | 'mp';
  onSearchTypeChange: (type: 'ai' | 'hansard' | 'mp') => void;
  useRecentFiles: boolean;
  onToggleRecentFiles: (value: boolean) => void;
  advancedSearch?: AdvancedSearchParams;
  onAdvancedSearchChange?: (params: AdvancedSearchParams) => void;
}

type HouseType = 'commons' | 'lords' | 'both' | null;

export function QueryBuilder({ 
  searchParams, 
  onSearch, 
  searchType,
  onSearchTypeChange,
  useRecentFiles,
  onToggleRecentFiles,
  advancedSearch = {},
  onAdvancedSearchChange = () => {}
}: QueryBuilderProps) {
  const router = useRouter();
  const { getRemainingAISearches, hasReachedAISearchLimit } = useEngagement();
  const [searchTerm, setSearchTerm] = useState(searchParams.searchTerm || '');
  const [selectedHouse, setSelectedHouse] = useState<HouseType>(searchParams.house || null);
  
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Add advanced search state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedParams, setAdvancedParams] = useState<AdvancedSearchParams>(advancedSearch);

  const handleSubmit = () => {
    if (hasReachedAISearchLimit()) {
      router.push('/pricing');
      return;
    }

    if (searchTerm.trim()) {
      const params = {
        searchTerm: searchTerm.trim(),
        house: selectedHouse,
        ...advancedParams // Include all advanced search params
      };
      onSearch(params as { searchTerm: string; house?: 'commons' | 'lords' | null; });
    }
  };

  const handleHouseSelection = (house: 'commons' | 'lords') => {
    if (selectedHouse === 'both') {
      // If both are selected, clicking either deselects it
      setSelectedHouse(house === 'commons' ? 'lords' : 'commons');
    } else if (selectedHouse === house) {
      // If clicking the selected house, deselect it
      setSelectedHouse(null);
    } else if (selectedHouse === null) {
      // If none selected, select the clicked house
      setSelectedHouse(house);
    } else {
      // If the other house is selected, select both
      setSelectedHouse('both');
    }
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    const newParams = {
      ...advancedParams,
      dateFrom: range.from,
      dateTo: range.to
    };
    setAdvancedParams(newParams);
    onAdvancedSearchChange(newParams);
  };

  // Update advanced params when filters change
  const handleTypeSelection = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [type];
      
      // Update advanced search params
      const newParams = {
        ...advancedParams,
        type: newTypes.length === 1 ? newTypes[0] : undefined
      };
      setAdvancedParams(newParams);
      onAdvancedSearchChange(newParams);
      
      return newTypes;
    });
  };


  const isHouseSelected = (house: 'commons' | 'lords') => {
    return selectedHouse === house || selectedHouse === 'both';
  };

  const handleAdvancedParamChange = (key: keyof AdvancedSearchParams, value: string) => {
    const newParams = { ...advancedParams, [key]: value };
    setAdvancedParams(newParams);
    onAdvancedSearchChange(newParams);
  };

  // Get remaining searches count
  const remainingSearches = getRemainingAISearches();

  return (
    <Card className="p-6 border-2">
      {/* Search Types */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {searchTypes.map((type) => (
          <Button
            key={type.id}
            variant={searchType === type.id ? "default" : "outline"}
            onClick={() => onSearchTypeChange(type.id)}
            className={cn(
              "flex flex-col h-auto py-6 px-4 space-y-3",
              searchType === type.id 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                : "hover:bg-muted border-2",
              "transition-all duration-200"
            )}
          >
            <div className="flex items-center gap-2.5">
              {type.icon}
              <span className="font-semibold tracking-tight"> {type.label}</span>
            </div>
          </Button>
        ))}
      </div>

      <div className="space-y-8">
        {/* Main Search Input */}
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                placeholder={
                  searchTypes.find(t => t.id === searchType)?.placeholder ||
                  "Search parliamentary debates..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg border-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <Button 
              onClick={handleSubmit}
              className="h-12 px-8"
              size="lg"
            >
              Search
            </Button>
          </div>
          
          {/* Add remaining searches indicator for AI search type */}
          {searchType === 'ai' && (
            <p className="text-sm text-muted-foreground">
              {remainingSearches === 0 ? (
                <><a href="/signup">Create an account</a> to try the assistant</>
              ) : remainingSearches === Infinity ? (
                "Unlimited AI searches available"
              ) : (
                `${remainingSearches} AI ${remainingSearches === 1 ? 'search' : 'searches'} remaining today`
              )}
            </p>
          )}
        </div>

        {/* Hansard-specific Controls */}
        {searchType === 'hansard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* House Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select House</Label>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleHouseSelection('commons')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 h-12 px-6",
                    isHouseSelected('commons') && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !selectedHouse && "border-dashed"
                  )}
                >
                  <Building2 className="h-5 w-5" />
                  Commons
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleHouseSelection('lords')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 h-12 px-6",
                    isHouseSelected('lords') && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !selectedHouse && "border-dashed"
                  )}
                >
                  <Building2 className="h-5 w-5" />
                  Lords
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedHouse === null && "Select house(s) to search"}
                {selectedHouse === 'both' && "Searching both Houses"}
                {selectedHouse === 'commons' && "Searching House of Commons"}
                {selectedHouse === 'lords' && "Searching House of Lords"}
              </p>
            </div>

            {/* Advanced Search Toggle */}
            <div className="space-y-3 pl-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="advanced-search" className="text-base font-semibold">Advanced Search</Label>
                <Switch
                  id="advanced-search"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Enable advanced search options to narrow your search.
              </p>
            </div>
          </div>
        )}

        {/* Advanced Search Fields */}
        {searchType === 'hansard' && showAdvanced && (
        <div className="space-y-6 p-6 border-2 rounded-lg bg-muted/5">
          <div className="grid grid-cols-1 gap-6">

            {/* New Advanced Search Fields */}
            <div className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label className="font-medium">Debate Type</Label>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                  {Object.keys(eventTypeColors).map((type) => (
                    <Badge
                      key={type}
                      variant={selectedTypes.includes(type) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer hover:opacity-80 transition-all",
                        selectedTypes.includes(type) ? "bg-primary" : "hover:bg-muted"
                      )}
                      onClick={() => handleTypeSelection(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="font-medium">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ 
                        from: dateRange.from,
                        to: dateRange.to
                      }}
                      onSelect={(range) => handleDateRangeChange({
                        from: range?.from,
                        to: range?.to
                      })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {(dateRange.from || dateRange.to) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDateRangeChange({ from: undefined, to: undefined })}
                    className="text-sm text-muted-foreground"
                  >
                    Clear dates
                  </Button>
                )}
              </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Recent Files Toggle */}
        {searchType === 'ai' && (
          <div className="flex items-center space-x-3 pt-2">
            <Switch
              id="recent-files"
              checked={useRecentFiles}
              onCheckedChange={onToggleRecentFiles}
              className="data-[state=checked]:bg-primary"
            />
            <Label 
              htmlFor="recent-files" 
              className="text-sm text-muted-foreground"
            >
              {useRecentFiles 
                ? "Searching debates from this week" 
                : "Searching all debates during the current government"}
            </Label>
          </div>
        )}
      </div>
    </Card>
  );
} 