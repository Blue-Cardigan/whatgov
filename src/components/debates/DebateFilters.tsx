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

// Add this type definition at the top with other interfaces
type FilterItem = {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
};

// Update the helper function with proper typing
function getItemsForFilter(id: string): FilterItem[] {
  switch (id) {
    case 'type':
      return [...DEBATE_TYPES.Commons, ...DEBATE_TYPES.Lords]
        .map(({ type, label }): FilterItem => ({ 
          value: type, 
          label 
        }));
    case 'location':
      return Object.entries(locationColors)
        .map(([location, color]): FilterItem => ({ 
          value: location, 
          label: location, 
          color 
        }));
    case 'days':
      return DAYS.map((day): FilterItem => ({ 
        value: day, 
        label: day 
      }));
    case 'topics':
      return TOPICS.map((topic): FilterItem => ({
        value: topic.label,
        label: topic.label,
        icon: topic.icon
      }));
    default:
      return [];
  }
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
                    ? "border-primary bg-primary/5" 
                    : "border-muted group-hover:border-muted-foreground/50 bg-background"
                )}>
                  <Icon className={cn(
                    "w-6 h-6 transition-colors",
                    hasActiveFilters 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {hasActiveFilters && (
                    <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary text-[11px] flex items-center justify-center text-primary-foreground font-medium">
                      {filters[id].length}
                    </span>
                  )}
                </div>
                <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {label}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-72 p-0" 
              align="center"
              side={isMobile ? "bottom" : "left"}
              sideOffset={8}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium text-md">{label}</h4>
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">
                        {filters[id].length}
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
                    <CheckCheck className={cn(
                      "w-4 h-4",
                      someSelected && !allSelected && "opacity-50"
                    )} />
                  </button>
                </div>

                <ScrollArea className="max-h-[320px] overflow-y-auto">
                  {id === 'type' ? (
                    <div>
                      {Object.entries(DEBATE_TYPES).map(([house, types]) => (
                        <div key={house}>
                          <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                            {house === 'Commons' ? 'House of Commons' : 'House of Lords'}
                          </div>
                          {types
                            .filter(type => {
                              if (filters.location.length === 0) return true;
                              return getAvailableTypes(filters.location).includes(type.type);
                            })
                            .map(type => (
                              <button 
                                key={type.type}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2.5",
                                  "transition-all duration-200 text-md relative text-left",
                                  "hover:bg-muted/70 active:bg-muted",
                                  "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px",
                                  "after:opacity-100",
                                  house === 'Commons' && "after:bg-[rgb(0,110,70)]",
                                  house === 'Lords' && "after:bg-[rgb(163,36,59)]",
                                  filters.type.includes(type.type) && [
                                    "bg-primary/10 text-primary hover:bg-primary/15",
                                    "after:bg-primary/20"
                                  ]
                                )}
                                onClick={() => {
                                  handleFilterChange(
                                    'type',
                                    filters.type.includes(type.type)
                                      ? filters.type.filter(t => t !== type.type)
                                      : [...filters.type, type.type]
                                  );
                                }}
                              >
                                <span className="flex-1 font-medium">{type.label}</span>
                                {filters.type.includes(type.type) && (
                                  <Check className="w-4 h-4 shrink-0" />
                                )}
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {getItemsForFilter(id)
                        .filter(item => {
                          if (id === 'location' && filters.type.length > 0) {
                            return getAvailableLocations(filters.type).includes(item.value);
                          }
                          return true;
                        })
                        .map(item => (
                          <button 
                            key={item.value}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2.5",
                              "transition-all duration-200 text-md relative text-left",
                              "hover:bg-muted/70 active:bg-muted",
                              filters[id].includes(item.value)
                                ? "bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-foreground"
                            )}
                            onClick={() => {
                              handleFilterChange(
                                id,
                                filters[id].includes(item.value)
                                  ? filters[id].filter(v => v !== item.value)
                                  : [...filters[id], item.value]
                              );
                            }}
                          >
                            <div className="flex-1 flex items-center gap-2">
                              {item.icon && (
                                <item.icon className={cn(
                                  "w-4 h-4",
                                  filters[id].includes(item.value)
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                )} />
                              )}
                              {item.color && (
                                <span
                                  className={cn(
                                    "w-3 h-3 rounded-full ring-1",
                                    filters[id].includes(item.value)
                                      ? "ring-primary"
                                      : "ring-border"
                                  )}
                                  style={{ backgroundColor: item.color }}
                                />
                              )}
                              <span className="font-medium">{item.label}</span>
                            </div>
                            {filters[id].includes(item.value) && (
                              <Check className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </ScrollArea>

                {((id === 'type' && filters.location.length > 0) ||
                  (id === 'location' && filters.type.length > 0)) && (
                  <div className="px-3 py-2 text-sm text-muted-foreground border-t bg-muted/30">
                    Showing options available for current selection
                  </div>
                )}

                {hasActiveFilters && (
                  <div className="p-2 border-t bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs font-medium hover:bg-muted"
                      onClick={() => {
                        handleFilterChange(id, []);
                        setOpen(prev => ({ ...prev, [id]: false }));
                      }}
                    >
                      Clear {label.toLowerCase()}
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
} 