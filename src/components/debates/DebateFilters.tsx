import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon, UserIcon } from "lucide-react";
import { locationColors, TOPICS, DAYS, DEBATE_TYPES } from '@/lib/utils';
import type { FeedFilters } from "@/types";

interface FiltersProps {
  filters: Omit<FeedFilters, 'house'>;
  onChange: (filters: Omit<FeedFilters, 'house'>) => void;
  filterItems: readonly {
    id: keyof Omit<Omit<FeedFilters, 'house'>, 'mpOnly'>;
    icon: LucideIcon;
    label: string;
  }[];
}

// Define the type for a mapping entry
type LocationTypeMapping = {
  location: string;
  types: readonly string[];
};

// Update the constant with the type
const LOCATION_TYPE_MAPPINGS: readonly LocationTypeMapping[] = [
  { location: "Written Corrections", types: ["Generic", "Department", "Main"] },
  { location: "Commons Chamber", types: ["Debated Motion", "Statement", "Business Without Debate", "Question", "Debated Bill", "Delegated Legislation", "Generic", "Petition", "Urgent Question", "Opposition Day", "Bill Procedure", "Main", "Department"] },
  { location: "Westminster Hall", types: ["Debated Motion", "Bill Procedure", "Debated Bill", "Westminster Hall", "Main"] },
  { location: "Public Bill Committees", types: ["Public Bill Committees"] },
  { location: "Lords Chamber", types: ["Lords Chamber"] },
  { location: "Written Statements", types: ["Main", "Statement"] },
  { location: "Grand Committee", types: ["Grand Committee"] },
  { location: "General Committees", types: ["General Committees"] },
  { location: "Petitions", types: ["Petition", "Main"] },
] as const;

// First, let's create a type for our filters
type FilterValues = Omit<FeedFilters, 'house'>;
type FilterKey = keyof Omit<FilterValues, 'mpOnly'>;

function getAvailableTypes(selectedLocations: string[]): string[] {
  if (selectedLocations.length === 0) return [];
  return [...new Set(
    selectedLocations.flatMap(location => 
      LOCATION_TYPE_MAPPINGS.find(m => m.location === location)?.types ?? []
    )
  )];
}

function getAvailableLocations(selectedTypes: string[]): string[] {
  if (selectedTypes.length === 0) return [];
  return [...new Set(
    selectedTypes.flatMap(type => 
      LOCATION_TYPE_MAPPINGS
        .filter(m => m.types.includes(type))
        .map(m => m.location)
    )
  )];
}

export function DebateFilters({ filters, onChange, filterItems }: FiltersProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkWidth();

    window.addEventListener('resize', checkWidth);
    
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Update the handleFilterChange function with proper typing
  const handleFilterChange = (
    id: keyof Omit<FeedFilters, 'house' | 'mpOnly'>,
    newValues: string[]
  ) => {
    const updatedFilters: Omit<FeedFilters, 'house'> = { ...filters };

    if (id === 'type' || id === 'location' || id === 'days' || id === 'topics') {
      updatedFilters[id] = newValues;

      // Update related filters based on selection
      if (id === 'location') {
        const availableTypes = getAvailableTypes(newValues);
        updatedFilters.type = filters.type.filter(t => availableTypes.includes(t));
      } else if (id === 'type') {
        const availableLocations = getAvailableLocations(newValues);
        updatedFilters.location = filters.location.filter(l => availableLocations.includes(l));
      }
    }

    onChange(updatedFilters);
  };

  const renderFilterContent = (activeFilter: keyof FiltersProps['filters']) => {
    const renderFilterList = (
      items: { value: string; label: string; icon?: LucideIcon; color?: string }[],
      selectedValues: string[],
      onChange: (values: string[]) => void
    ) => {
      let availableItems = items;
      if (activeFilter === 'type' && filters.location.length > 0) {
        const availableTypes = getAvailableTypes(filters.location);
        availableItems = items.filter(item => availableTypes.includes(item.value));
      } else if (activeFilter === 'location' && filters.type.length > 0) {
        const availableLocations = getAvailableLocations(filters.type);
        availableItems = items.filter(item => availableLocations.includes(item.value));
      }

      if (activeFilter === 'type') {
        const groupedItems = availableItems.reduce((acc, item) => {
          const debateType = [...DEBATE_TYPES.Commons, ...DEBATE_TYPES.Lords]
            .find(t => t.type === item.value);
          const house = debateType?.house || "Commons";
          
          if (!acc[house]) acc[house] = [];
          acc[house].push(item);
          return acc;
        }, {} as Record<'Commons' | 'Lords', typeof items>);

        return (
          <div>
            {Object.entries(groupedItems).map(([house, houseItems]) => (
              <div key={house}>
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                  {house === 'Commons' ? 'House of Commons' : 'House of Lords'}
                </div>
                {houseItems.map(item => renderFilterItem(
                  item,
                  selectedValues,
                  onChange,
                  house as 'Commons' | 'Lords'
                ))}
              </div>
            ))}
          </div>
        );
      }

      return (
        <div>
          {availableItems.map(item => renderFilterItem(item, selectedValues, onChange))}
        </div>
      );
    };

    const renderFilterItem = (
      { value, label, icon: Icon, color }: {
        value: string;
        label: string;
        icon?: LucideIcon;
        color?: string;
      },
      selectedValues: string[],
      onChange: (values: string[]) => void,
      house?: 'Commons' | 'Lords'
    ) => {
      const isSelected = selectedValues.includes(value);
      
      return (
        <button 
          key={value}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2",
            "transition-colors text-md relative text-left",
            "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px",
            house && "after:opacity-100",
            house === 'Commons' && "after:bg-[rgb(0,110,70)]",
            house === 'Lords' && "after:bg-[rgb(163,36,59)]",
            isSelected 
              ? "bg-primary/10 text-primary hover:bg-primary/15" 
              : "hover:bg-muted text-foreground"
          )}
          onClick={() => {
            onChange(
              isSelected
                ? selectedValues.filter(v => v !== value)
                : [...selectedValues, value]
            );
          }}
        >
          <div className="flex-1 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
            {color && (
              <span
                className="w-3 h-3 rounded-full ring-1 ring-border"
                style={{ backgroundColor: color }}
              />
            )}
            <span className="font-medium">{label}</span>
          </div>
          {isSelected && <Check className="w-4 h-4 shrink-0" />}
        </button>
      );
    };

    if (activeFilter === 'mpOnly') {
      return (
        <button 
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2",
            "transition-colors text-md relative text-left",
            filters.mpOnly 
              ? "bg-primary/10 text-primary hover:bg-primary/15" 
              : "hover:bg-muted text-foreground"
          )}
          onClick={() => onChange({ ...filters, mpOnly: !filters.mpOnly })}
        >
          <div className="flex-1 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Show only my MP&apos;s debates</span>
          </div>
          {filters.mpOnly && <Check className="w-4 h-4 shrink-0" />}
        </button>
      );
    }

    switch (activeFilter) {
      case 'type':
        return renderFilterList(
          [...DEBATE_TYPES.Commons, ...DEBATE_TYPES.Lords].map(({ type, label }) => ({
            value: type,
            label: label
          })),
          filters.type,
          (values) => handleFilterChange('type', values)
        );
      
      case 'location':
        return renderFilterList(
          Object.entries(locationColors).map(([location, color]) => ({
            value: location,
            label: location,
            color
          })),
          filters.location,
          (values) => handleFilterChange('location', values)
        );
      
      case 'days':
        return renderFilterList(
          DAYS.map((day) => ({ value: day, label: day })),
          filters.days,
          (values) => handleFilterChange('days', values)
        );
      
      case 'topics':
        return renderFilterList(
          TOPICS.map(topic => ({
            value: topic.label,
            label: topic.label,
            icon: topic.icon
          })),
          filters.topics,
          (values) => handleFilterChange('topics', values)
        );
    }
  };

  return (
    <div className={cn(
      "w-full grid grid-cols-5",
      "md:grid-cols-1 md:gap-y-6 px-4 py-3 md:pt-6 md:px-0"
    )}>
      <button
        className={cn(
          "group flex flex-col items-center gap-1.5",
          "justify-self-center relative",
          "after:content-[''] after:absolute after:bottom-0 after:left-1/2",
          "after:w-1 after:h-1 after:rounded-full after:bg-primary",
          "after:transform after:-translate-x-1/2 after:translate-y-3",
          "after:opacity-0 after:transition-opacity"
        )}
        onClick={() => onChange({ ...filters, mpOnly: !filters.mpOnly })}
      >
        <div className={cn(
          "relative rounded-full p-3.5 transition-all duration-200",
          "border-2",
          filters.mpOnly 
            ? "border-primary bg-primary/5" 
            : "border-muted group-hover:border-muted-foreground/50 bg-background"
        )}>
          <UserIcon className={cn(
            "w-6 h-6 transition-colors",
            filters.mpOnly 
              ? "text-primary" 
              : "text-muted-foreground group-hover:text-foreground"
          )} />
        </div>
        <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          My MP
        </span>
      </button>

      {filterItems.map(({ id, icon: Icon, label }) => {
        const hasActiveFilters = filters[id].length > 0;
        const items = getItemsForFilter(id);
        const allSelected = items.every(item => 
          filters[id].includes(item.value)
        );
        const someSelected = items.some(item => 
          filters[id].includes(item.value)
        );
        
        return (
          <Popover 
            key={id} 
            open={open[id]} 
            onOpenChange={(isOpen) => setOpen(prev => ({ ...prev, [id]: isOpen }))}
          >
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "group flex flex-col items-center gap-1.5",
                  "justify-self-center relative",
                  "after:content-[''] after:absolute after:bottom-0 after:left-1/2",
                  "after:w-1 after:h-1 after:rounded-full after:bg-primary",
                  "after:transform after:-translate-x-1/2 after:translate-y-3",
                  "after:opacity-0 after:transition-opacity",
                  open[id] && "after:opacity-100"
                )}
              >
                <div className={cn(
                  "relative rounded-full p-3.5 transition-all duration-200",
                  "border-2",
                  hasActiveFilters 
                    ? "border-primary" 
                    : "border-muted group-hover:border-muted-foreground/50",
                  hasActiveFilters
                    ? "bg-primary/5"
                    : "bg-background"
                )}>
                  <Icon className={cn(
                    "w-6 h-6 transition-colors",
                    hasActiveFilters 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {hasActiveFilters && (
                    <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary text-[11px] flex items-center justify-center text-primary-foreground font-medium">
                      {Array.isArray(filters[id]) ? filters[id].length : 0}
                    </span>
                  )}
                </div>
                <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {label}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-64 p-0" 
              align="center"
              side={isMobile ? "bottom" : "left"}
              sideOffset={8}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium text-md">{label}</h4>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {Array.isArray(filters[id]) ? filters[id].length : 0}
                    </Badge>
                  )}
                </div>
                <button
                  className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center",
                    "transition-colors",
                    allSelected 
                      ? "bg-primary/10 text-primary hover:bg-primary/15" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    const newValues = allSelected
                      ? []
                      : items.map(item => item.value);
                    handleFilterChange(id, newValues);
                  }}
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? (
                    <CheckCheck className="w-4 h-4" />
                  ) : (
                    <CheckCheck className={cn(
                      "w-4 h-4",
                      someSelected && "opacity-50"
                    )} />
                  )}
                </button>
              </div>

              <ScrollArea className="max-h-[320px] overflow-y-auto">
                {renderFilterContent(id)}
              </ScrollArea>

              {((id === 'type' && filters.location.length > 0) ||
                (id === 'location' && filters.type.length > 0)) && (
                <div className="px-3 py-2 text-sm text-muted-foreground border-t">
                  Showing options available for current selection
                </div>
              )}

              {hasActiveFilters && (
                <div className="p-2 border-t bg-muted/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      handleFilterChange(id, []);
                      setOpen(prev => ({ ...prev, [id]: false }));
                    }}
                  >
                    Clear {label.toLowerCase()}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

// Helper function to get items for each filter type
function getItemsForFilter(id: string) {
  switch (id) {
    case 'type':
      return [...DEBATE_TYPES.Commons, ...DEBATE_TYPES.Lords]
        .map(({ type, label }) => ({ value: type, label }));
    case 'location':
      return Object.entries(locationColors)
        .map(([location, color]) => ({ value: location, label: location, color }));
    case 'days':
      return DAYS.map(day => ({ value: day, label: day }));
    case 'topics':
      return TOPICS.map(topic => ({
        value: topic.label,
        label: topic.label,
        icon: topic.icon
      }));
    default:
      return [];
  }
} 