import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, CheckCheck, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserIcon } from "lucide-react";
import { DEBATE_TYPES } from '@/lib/utils';
import { useAuth } from "@/hooks/useAuth";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Vote } from "lucide-react";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FiltersProps {
  filters: Omit<FeedFilters, 'house'>;
  onChange: (filters: Omit<FeedFilters, 'house'>) => void;
  filterItems: readonly FilterItem[];
  isEnabled: boolean;
}

// Define the type for a mapping entry
type LocationTypeMapping = {
  location: string;
  types: readonly string[];
};

// Update the constant with the type
const LOCATION_TYPE_MAPPINGS: readonly LocationTypeMapping[] = [
  { location: "Written Corrections", types: ["Generic", "Department", "Main"] },
  { location: "Commons Chamber", types: ["Debated Motion", "Statement", "Business Without Debate", "Question", "Debated Bill", "Delegated Legislation", "Generic", "Petition", "Urgent Question", "Prime Minister's Questions", "Opposition Day", "Bill Procedure", "Main", "Department"] },
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

// Then, let's fix the filter type checking
function isArrayFilter(filter: FilterItem): filter is ArrayFilterItem {
  return filter.type === 'array';
}

// Add type guard for array filters
const isArrayValue = (value: boolean | string[]): value is string[] => Array.isArray(value);

// First, let's separate the filter types
type ArrayFilterId = 'location' | 'type' | 'days' | 'topics';
type BooleanFilterId = 'mpOnly' | 'divisionsOnly';

// Create a union type for all filter IDs
export type FilterId = ArrayFilterId | BooleanFilterId;

// Define the shape of array filter values
type ArrayFilterValue = {
  [K in ArrayFilterId]: string[];
};

// Define the shape of boolean filter values
type BooleanFilterValue = {
  [K in BooleanFilterId]: boolean;
};

// Combine them into the final FeedFilters type
export interface FeedFilters extends ArrayFilterValue, BooleanFilterValue {
  house: string[]; // Keep house separate as it's handled differently
}

// Define base properties for all filter items
interface BaseFilterItem {
  id: FilterId;
  icon: LucideIcon;
  label: string;
  tier: 'premium' | 'basic';
  description: string;
}

// Specific type for array filters
export interface ArrayFilterItem extends BaseFilterItem {
  id: ArrayFilterId;
  type: 'array';
  options: Array<{
    value: string;
    label: string;
    icon?: LucideIcon;
    color?: string;
  }>;
}

// Specific type for boolean filters
export interface BooleanFilterItem extends BaseFilterItem {
  id: BooleanFilterId;
  type: 'boolean';
}

// Union type for all filter items
export type FilterItem = ArrayFilterItem | BooleanFilterItem;

export function DebateFilters({ 
  filters, 
  onChange, 
  filterItems, 
  isEnabled
}: FiltersProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [isMobile] = useState(true);
  const { user, profile } = useAuth();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Check if MP filter is available (user is authenticated and has an MP)
  const isMpFilterAvailable = user && profile?.mp_id;

  // Helper function to check if a filter is active
  const isFilterActive = (filterId: keyof Omit<FeedFilters, 'house'>) => {
    const value = filters[filterId];
    return typeof value === 'boolean' ? value : value.length > 0;
  };

  // Update filter change handler
  const handleFilterChange = (
    filterId: FilterId,
    value: string[] | boolean
  ) => {
    // TypeScript will now ensure type safety
    if (isArrayFilterId(filterId) && Array.isArray(value)) {
      onChange({
        ...filters,
        [filterId]: value
      });
    } else if (isBooleanFilterId(filterId) && typeof value === 'boolean') {
      onChange({
        ...filters,
        [filterId]: value
      });
    }
  };

  // Type guard functions
  function isArrayFilterId(id: FilterId): id is ArrayFilterId {
    return ['location', 'type', 'days', 'topics'].includes(id);
  }

  function isBooleanFilterId(id: FilterId): id is BooleanFilterId {
    return ['mpOnly', 'divisionsOnly'].includes(id);
  }

  return (
    <>
      <div className="relative w-full">
        <div className={cn(
          "w-full px-4 md:px-0",
          "py-3 md:pt-6",
          
          "flex md:block",
          
          "overflow-x-auto md:overflow-visible",
          "snap-x snap-mandatory md:snap-none",
          
          "scrollbar-thin",
          "scrollbar-track-transparent",
          "scrollbar-thumb-muted-foreground/20",
          "hover:scrollbar-thumb-muted-foreground/30",
          
          "pb-2 md:pb-0",
          
          "firefox:scrollbar-none",
          
          "touch-pan-x",
          "-webkit-overflow-scrolling-touch"
        )}>
          <div className={cn(
            "flex gap-6",
            "md:flex md:flex-col md:gap-6",
            
            "px-4 md:px-0",
            
            "ml-[-16px] md:ml-0"
          )}>
            <div className="snap-start">
              <button
                className={cn(
                  "group flex flex-col items-center gap-1.5",
                  "justify-self-center relative",
                  (!user || !profile?.mp_id) && "opacity-50 cursor-not-allowed",
                  "after:content-[''] after:absolute after:bottom-0 after:left-1/2",
                  "after:w-1 after:h-1 after:rounded-full after:bg-primary",
                  "after:transform after:-translate-x-1/2 after:translate-y-3",
                  "after:opacity-0 after:transition-opacity"
                )}
                onClick={() => {
                  if (!user) {
                    setShowSignInPrompt(true);
                  } else if (!profile?.mp_id) {
                    setShowSignInPrompt(true);
                  } else {
                    handleFilterChange('mpOnly', !filters.mpOnly);
                  }
                }}
              >
                <div className={cn(
                  "relative rounded-full p-3.5 transition-all duration-200",
                  "border-2",
                  filters.mpOnly && isMpFilterAvailable
                    ? "border-primary bg-primary/5" 
                    : "border-muted group-hover:border-muted-foreground/50 bg-background"
                )}>
                  <UserIcon className={cn(
                    "w-6 h-6 transition-colors",
                    filters.mpOnly && isMpFilterAvailable
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                </div>
                <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  My MP
                </span>
              </button>
            </div>

            <div className="snap-start">
              <button
                className={cn(
                  "group flex flex-col items-center gap-1.5",
                  "justify-self-center relative",
                  (!isEnabled) && "opacity-50 cursor-not-allowed",
                  "after:content-[''] after:absolute after:bottom-0 after:left-1/2",
                  "after:w-1 after:h-1 after:rounded-full after:bg-primary",
                  "after:transform after:-translate-x-1/2 after:translate-y-3",
                  "after:opacity-0 after:transition-opacity"
                )}
                onClick={() => {
                  if (!user) {
                    setShowSignInPrompt(true);
                  } else if (!isEnabled) {
                    setShowUpgradeDialog(true);
                  } else {
                    handleFilterChange('divisionsOnly', !filters.divisionsOnly);
                  }
                }}
              >
                <div className={cn(
                  "relative rounded-full p-3.5 transition-all duration-200",
                  "border-2",
                  filters.divisionsOnly && isEnabled
                    ? "border-primary bg-primary/5" 
                    : "border-muted group-hover:border-muted-foreground/50 bg-background"
                )}>
                  <Vote className={cn(
                    "w-6 h-6 transition-colors",
                    filters.divisionsOnly && isEnabled
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                </div>
                <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Divisions
                </span>
              </button>
            </div>

            {isEnabled && filterItems
              .filter(filter => filter.type === 'array')
              .map((filter) => (
                <div key={filter.id} className="snap-start">
                  <Popover 
                    key={filter.id} 
                    open={open[filter.id]}
                    onOpenChange={(isOpen) => {
                      setOpen(prev => ({ ...prev, [filter.id]: isOpen }));
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "group flex flex-col items-center gap-1.5",
                          "justify-self-center relative",
                          !isEnabled && "opacity-50 cursor-not-allowed",
                          "after:content-[''] after:absolute after:bottom-0 after:left-1/2",
                          "after:w-1 after:h-1 after:rounded-full after:bg-primary",
                          "after:transform after:-translate-x-1/2 after:translate-y-3",
                          "after:opacity-0 after:transition-opacity",
                          isFilterActive(filter.id) && "after:opacity-100"
                        )}
                        disabled={!isEnabled}
                      >
                        <div className={cn(
                          "relative rounded-full p-3.5 transition-all duration-200",
                          "border-2",
                          isFilterActive(filter.id) && isEnabled
                            ? "border-primary bg-primary/5" 
                            : "border-muted group-hover:border-muted-foreground/50 bg-background"
                        )}>
                          <filter.icon className={cn(
                            "w-6 h-6 transition-colors",
                            isFilterActive(filter.id) && isEnabled
                              ? "text-primary" 
                              : "text-muted-foreground group-hover:text-foreground"
                          )} />
                        </div>
                        <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {filter.label}
                        </span>
                      </button>
                    </PopoverTrigger>
                    {isEnabled && (
                      <PopoverContent 
                        className="w-72 p-0" 
                        align="center"
                        side={isMobile ? "bottom" : "left"}
                        sideOffset={8}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between p-3 border-b">
                            <div className="flex items-center gap-2">
                              <filter.icon className="w-4 h-4 text-muted-foreground" />
                              <h4 className="font-medium text-md">{filter.label}</h4>
                              {isFilterActive(filter.id) && (
                                <Badge variant="secondary" className="ml-2">
                                  {isArrayFilter(filter) ? filters[filter.id].length : 1}
                                </Badge>
                              )}
                            </div>
                            <button
                              className={cn(
                                "h-8 w-8 rounded-md flex items-center justify-center",
                                "transition-colors",
                                isFilterActive(filter.id) && isEnabled
                                  ? "bg-primary/10 text-primary hover:bg-primary/15" 
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => {
                                if (isEnabled) {
                                  if (typeof filters[filter.id] === 'boolean') {
                                    // Toggle boolean filters
                                    handleFilterChange(
                                      filter.id,
                                      !filters[filter.id]
                                    );
                                  } else {
                                    // Clear array filters
                                    handleFilterChange(
                                      filter.id,
                                      Array.isArray(filters[filter.id]) ? [] : filters[filter.id]
                                    );
                                  }
                                }
                              }}
                              title="Clear"
                            >
                              <CheckCheck className={cn(
                                "w-4 h-4",
                                isFilterActive(filter.id) && isEnabled && "opacity-50"
                              )} />
                            </button>
                          </div>

                          <ScrollArea className="max-h-[320px] overflow-y-auto">
                            {filter.id === 'type' ? (
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
                                            filters[filter.id].includes(type.type) && [
                                              "bg-primary/10 text-primary hover:bg-primary/15",
                                              "after:bg-primary/20"
                                            ]
                                          )}
                                          onClick={() => {
                                            handleFilterChange(
                                              filter.id,
                                              filters[filter.id].includes(type.type)
                                                ? filters[filter.id].filter(t => t !== type.type)
                                                : [...filters[filter.id], type.type]
                                            );
                                          }}
                                        >
                                          <span className="flex-1 font-medium">{type.label}</span>
                                          {filters[filter.id].includes(type.type) && (
                                            <Check className="w-4 h-4 shrink-0" />
                                          )}
                                        </button>
                                      ))}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div>
                                {isArrayFilter(filter) && (
                                  <div>
                                    {filter.options
                                      .filter(item => {
                                        if (filter.id === 'location' && filters.type.length > 0) {
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
                                            isArrayValue(filters[filter.id]) && filters[filter.id].includes(item.value)
                                              ? "bg-primary/10 text-primary hover:bg-primary/15"
                                              : "text-foreground"
                                          )}
                                          onClick={() => {
                                            if (isArrayValue(filters[filter.id])) {
                                              handleFilterChange(
                                                filter.id,
                                                filters[filter.id].includes(item.value)
                                                  ? filters[filter.id].filter(v => v !== item.value)
                                                  : [...filters[filter.id], item.value]
                                              );
                                            }
                                          }}
                                        >
                                          <div className="flex-1 flex items-center gap-2">
                                            {item.icon && (
                                              <item.icon className={cn(
                                                "w-4 h-4",
                                                isArrayValue(filters[filter.id]) && filters[filter.id].includes(item.value)
                                                  ? "text-primary"
                                                  : "text-muted-foreground"
                                              )} />
                                            )}
                                            {item.color && (
                                              <span
                                                className={cn(
                                                  "w-3 h-3 rounded-full ring-1",
                                                  isArrayValue(filters[filter.id]) && filters[filter.id].includes(item.value)
                                                    ? "ring-primary"
                                                    : "ring-border"
                                                )}
                                                style={{ backgroundColor: item.color }}
                                              />
                                            )}
                                            <span className="font-medium">{item.label}</span>
                                          </div>
                                          {isArrayValue(filters[filter.id]) && filters[filter.id].includes(item.value) && (
                                            <Check className="w-4 h-4 shrink-0" />
                                          )}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </ScrollArea>

                          {((filter.id === 'type' && filters.location.length > 0) ||
                            (filter.id === 'location' && filters.type.length > 0)) && (
                            <div className="px-3 py-2 text-sm text-muted-foreground border-t bg-muted/30">
                              Showing options available for current selection
                            </div>
                          )}

                          {isFilterActive(filter.id) && (
                            <div className="p-2 border-t bg-muted/30">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-xs font-medium hover:bg-muted"
                                onClick={() => {
                                  handleFilterChange(
                                    filter.id,
                                    []
                                  );
                                  setOpen(prev => ({ ...prev, [filter.id]: false }));
                                }}
                              >
                                Clear {filter.label.toLowerCase()}
                              </Button>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                </div>
              ))}

            {!isEnabled && (
              <div className="snap-start">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "group flex flex-col items-center gap-1.5",
                          "justify-self-center relative",
                          "text-muted-foreground hover:text-primary"
                        )}
                        onClick={() => setShowUpgradeDialog(true)}
                      >
                        <div className={cn(
                          "relative rounded-full p-3.5 transition-all duration-200",
                          "border-2 border-muted group-hover:border-muted-foreground/50 bg-background"
                        )}>
                          <Lock className="w-6 h-6" />
                        </div>
                        <span className="text-md font-medium">
                          More Filters
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Upgrade to Engaged Citizen to access all filters
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showSignInPrompt} onOpenChange={setShowSignInPrompt}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogTitle className="sr-only">
            {user ? "Add your MP to filter" : "Sign in to filter by your MP"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {user 
              ? "Add your postcode to your profile to see debates from your local MP."
              : "Create an account or sign in to see debates from your local MP."
            }
          </DialogDescription>
          <SignInPrompt
            title={user ? "Add your MP to filter" : "Sign in to filter by your MP"}
            description={user 
              ? "Add your postcode to your profile to see debates from your local MP."
              : "Create an account or sign in to see debates from your local MP."
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogTitle className="sr-only">
            Upgrade to Engaged Citizen
          </DialogTitle>
          <DialogDescription className="sr-only">
            Upgrade your account to access additional filtering options
          </DialogDescription>
          <SignInPrompt
            title="Upgrade to Engaged Citizen"
            description="Upgrade your account to access additional filtering options and get more insights from parliamentary debates."
          />
        </DialogContent>
      </Dialog>
    </>
  );
} 