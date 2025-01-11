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
  
  const [localParams, setLocalParams] = useState({
    house: searchParams.house
  });

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

  const handleSubmit = () => {
    onSearch({
      searchTerm,
      ...localParams
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