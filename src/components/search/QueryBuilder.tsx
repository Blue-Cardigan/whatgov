import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { 
  LightbulbIcon, 
  BookOpenIcon, 
  UserIcon,
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEngagement } from '@/hooks/useEngagement';
import { SearchParams } from '@/types/search';
import { Card } from "@/components/ui/card";

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

// Add type for search types
type SearchType = typeof searchTypes[number]['id'];

type AdvancedSearchParams = {
  text?: string;
  debate?: string;
  spokenBy?: string;
};

interface QueryBuilderProps {
  searchParams: {
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    house?: 'Commons' | 'Lords';
  };
  onSearch: (params: SearchParams) => void;
  searchType: SearchType;
  onSearchTypeChange: (type: SearchType) => void;
  useRecentFiles?: boolean;
  onToggleRecentFiles?: (value: boolean) => void;
  advancedSearch?: AdvancedSearchParams;
  onAdvancedSearchChange?: (params: AdvancedSearchParams) => void;
}

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
  
  const [localParams, setLocalParams] = useState({
    house: searchParams.house
  });

  // Add advanced search state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedParams, setAdvancedParams] = useState<AdvancedSearchParams>(advancedSearch);

  const handleAdvancedParamChange = (key: keyof AdvancedSearchParams, value: string) => {
    const newParams = { ...advancedParams, [key]: value };
    setAdvancedParams(newParams);
    onAdvancedSearchChange(newParams);
  };

  const constructSearchQuery = () => {
    if (searchType !== 'hansard' || !showAdvanced) {
      return searchTerm;
    }

    const parts: string[] = [];
    if (advancedParams.text) parts.push(`words:${advancedParams.text}`);
    if (advancedParams.debate) parts.push(`debate:${advancedParams.debate}`);
    if (advancedParams.spokenBy) parts.push(`spokenby:${advancedParams.spokenBy}`);
    return parts.join(' AND ');
  };

  const handleSubmit = () => {
    if (hasReachedAISearchLimit()) {
      router.push('/pricing');
      return;
    }

    const query = constructSearchQuery();
    if (query.trim()) {
      const params = {
        searchTerm: query.trim(),
        ...localParams
      };
      onSearch(params);
    }
  };

  const handleHouseChange = (house: 'Commons' | 'Lords') => {
    setLocalParams(prev => {
      if (prev.house === house) {
        return {
          ...prev,
          house: undefined
        };
      }
      
      if (prev.house && prev.house !== house) {
        return {
          ...prev,
          house: undefined
        };
      }
      
      return {
        ...prev,
        house: house
      };
    });
  };

  return (
    <Card className="p-6 border-2">
      <div className="space-y-6">
        {/* Search Types */}
        <div className="grid grid-cols-3 gap-4">
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

        {/* Search Input and Filters */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              {!showAdvanced && (
                <Input
                  placeholder={
                    searchTypes.find(t => t.id === searchType)?.placeholder ||
                    "Search parliamentary debates..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 transition-colors duration-200 focus-visible:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
              )}
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <Button 
              onClick={handleSubmit}
              className="h-14 px-8 text-base font-medium shadow-sm hover:shadow-md transition-all duration-200"
              size="lg"
            >
              Search
            </Button>
          </div>

          {/* Remaining Searches Indicator */}
          {searchType === 'ai' && (
            <p className="text-sm text-muted-foreground font-medium">
              {`You have ${getRemainingAISearches()} free searches remaining today.`}
            </p>
          )}

          {/* Advanced Search Toggle for Hansard */}
          {searchType === 'hansard' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="advanced-search"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="advanced-search" className="font-medium">Advanced Search</Label>
              </div>

              {showAdvanced && (
                <div className="space-y-4 p-6 border-2 rounded-lg bg-muted/5">
                  <div className="space-y-2">
                    <Label htmlFor="debate-search" className="font-medium">Search Debate Titles</Label>
                    <Input
                      id="debate-search"
                      placeholder="Enter debate title..."
                      value={advancedParams.debate || ''}
                      onChange={(e) => handleAdvancedParamChange('debate', e.target.value)}
                      className="border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text-search" className="font-medium">Search Debate Text</Label>
                    <Input
                      id="text-search"
                      placeholder="Enter text to search within debates..."
                      value={advancedParams.text || ''}
                      onChange={(e) => handleAdvancedParamChange('text', e.target.value)}
                      className="border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="speaker-search" className="font-medium">Search by Speaker</Label>
                    <Input
                      id="speaker-search"
                      placeholder="Enter speaker name..."
                      value={advancedParams.spokenBy || ''}
                      onChange={(e) => handleAdvancedParamChange('spokenBy', e.target.value)}
                      className="border-2"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add scope indicator for Hansard search */}
          {searchType === 'hansard' && (
            <p className="text-sm text-muted-foreground font-medium">
              Showing most recent results
            </p>
          )}

          {/* AI Recent Files Toggle */}
          {searchType === 'ai' && (
            <div className="flex items-center space-x-2.5 pt-2">
              <Switch
                id="recent-files"
                checked={useRecentFiles}
                onCheckedChange={onToggleRecentFiles}
                className="data-[state=checked]:bg-primary"
              />
              <Label 
                htmlFor="recent-files" 
                className="text-sm text-muted-foreground font-medium"
              >
                {useRecentFiles 
                  ? "Searching debates from this week" 
                  : "Searching all debates during the current government"}
              </Label>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 