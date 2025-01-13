import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  LightbulbIcon, 
  BookOpenIcon, 
  UserIcon,
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSearch } from '@/contexts/SearchContext';

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
  onSearch: (params: any) => void;
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
  const { dispatch } = useSearch();
  const router = useRouter();
  const { user } = useAuth();
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

  const currentSearchType = searchTypes.find(t => t.id === searchType);

  // Get active filters count - now only for house filter
  const activeFiltersCount = currentSearchType?.showFilters ? [
    localParams.house
  ].filter(Boolean).length : 0;

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
            {!showAdvanced && (
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
            )}
          </div>
          <Button 
            onClick={handleSubmit}
            className="shrink-0"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Advanced Search Toggle for Hansard */}
        {searchType === 'hansard' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="advanced-search"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
              <Label htmlFor="advanced-search">Advanced Search</Label>
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="debate-search">Search Debate Titles</Label>
                  <Input
                    id="debate-search"
                    placeholder="Enter debate title..."
                    value={advancedParams.debate || ''}
                    onChange={(e) => handleAdvancedParamChange('debate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-search">Search Debate Text</Label>
                  <Input
                    id="text-search"
                    placeholder="Enter text to search within debates..."
                    value={advancedParams.text || ''}
                    onChange={(e) => handleAdvancedParamChange('text', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speaker-search">Search by Speaker</Label>
                  <Input
                    id="speaker-search"
                    placeholder="Enter speaker name..."
                    value={advancedParams.spokenBy || ''}
                    onChange={(e) => handleAdvancedParamChange('spokenBy', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add scope indicator for Hansard search */}
        {searchType === 'hansard' && (
          <p className="text-sm text-muted-foreground">
            Showing most recent results
          </p>
        )}

        {/* AI Recent Files Toggle */}
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

      {/* House Filter - Only for Hansard search */}
      {searchType === 'hansard' && (
        <div className="space-y-2">
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
  );
} 