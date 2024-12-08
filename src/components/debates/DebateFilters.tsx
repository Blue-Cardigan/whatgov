import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, CheckCheck, LucideIcon, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserIcon } from "lucide-react";
import { DEBATE_TYPES } from '@/lib/utils';
import { useAuth } from "@/contexts/AuthContext";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Vote } from "lucide-react";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface FiltersProps {
  filters: Omit<FeedFilters, 'house'>;
  onChange: (filters: Omit<FeedFilters, 'house'>) => void;
  filterItems: readonly FilterItem[];
  isEnabled: boolean;
  onUpgrade: () => void;
}

// First, let's separate the filter types
type ArrayFilterId = 'type' | 'days' | 'topics';
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
  isEnabled,
  onUpgrade
}: FiltersProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [isMobile] = useState(true);
  const { user, profile, loading } = useAuth();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showDivisionsPrompt, setShowDivisionsPrompt] = useState(false);

  // Show skeletons while loading auth state
  if (loading) {
    return (
      <div className="relative w-full">
        <div className={cn(
          "w-full px-4 md:px-0",
          "py-3 md:pt-6",
          "flex md:block",
          "overflow-x-auto md:overflow-visible",
          "snap-x snap-mandatory md:snap-none",
        )}>
          <div className={cn(
            "flex gap-6",
            "md:flex md:flex-col md:gap-6",
            "px-4 md:px-0",
            "ml-[-16px] md:ml-0"
          )}>
            {/* Generate skeletons for all filter buttons */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="snap-start">
                <div className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-[52px] w-[52px] rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
    return ['type', 'days', 'topics'].includes(id);
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
          "-webkit-overflow-scrolling-touch",
          "overflow-y-hidden",
          "max-h-[100px] md:max-h-none"
        )}>
          <div className={cn(
            "flex gap-6",
            "md:flex md:flex-col md:gap-6",
            "px-4 md:px-0",
            "ml-[-16px] md:ml-0",
            "min-h-[84px] md:min-h-0"
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
                  (!user) && "opacity-50 cursor-not-allowed",
                  "after:content-[''] after:absolute after:bottom-0 after:left-1/2",
                  "after:w-1 after:h-1 after:rounded-full after:bg-primary",
                  "after:transform after:-translate-x-1/2 after:translate-y-3",
                  "after:opacity-0 after:transition-opacity"
                )}
                onClick={() => {
                  if (!user) {
                    setShowDivisionsPrompt(true);
                  } else {
                    handleFilterChange('divisionsOnly', !filters.divisionsOnly);
                  }
                }}
              >
                <div className={cn(
                  "relative rounded-full p-3.5 transition-all duration-200",
                  "border-2",
                  filters.divisionsOnly && user
                    ? "border-primary bg-primary/5" 
                    : "border-muted group-hover:border-muted-foreground/50 bg-background"
                )}>
                  <Vote className={cn(
                    "w-6 h-6 transition-colors",
                    filters.divisionsOnly && user
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                </div>
                <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Divisions
                </span>
              </button>
            </div>

            <div className="snap-start">
              <Popover 
                key="type"
                open={open['type']}
                onOpenChange={(isOpen) => {
                  setOpen(prev => ({ ...prev, type: isOpen }));
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
                      isFilterActive('type') && "after:opacity-100"
                    )}
                    disabled={!isEnabled}
                  >
                    <div className={cn(
                      "relative rounded-full p-3.5 transition-all duration-200",
                      "border-2",
                      isFilterActive('type') && isEnabled
                        ? "border-primary bg-primary/5" 
                        : "border-muted group-hover:border-muted-foreground/50 bg-background"
                    )}>
                      <LayoutList className={cn(
                        "w-6 h-6 transition-colors",
                        isFilterActive('type') && isEnabled
                          ? "text-primary" 
                          : "text-muted-foreground group-hover:text-foreground"
                      )} />
                    </div>
                    <span className="text-md font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Type
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
                          <LayoutList className="w-4 h-4 text-muted-foreground" />
                          <h4 className="font-medium text-md">Type</h4>
                          {isFilterActive('type') && (
                            <Badge variant="secondary" className="ml-2">
                              {filters['type'].length}
                            </Badge>
                          )}
                        </div>
                        <button
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center",
                            "transition-colors",
                            isFilterActive('type') && isEnabled
                              ? "bg-primary/10 text-primary hover:bg-primary/15" 
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => {
                            if (isEnabled) {
                              // Toggle between all items and no items
                              if (filters['type'].length === 0) {
                                // Select all available types
                                const allTypes = Object.values(DEBATE_TYPES)
                                  .flatMap(types => types.map(t => t.type));
                                handleFilterChange('type', allTypes);
                              } else {
                                // Clear selection
                                handleFilterChange('type', []);
                              }
                            }
                          }}
                          title={isFilterActive('type') ? "Clear all" : "Select all"}
                        >
                          <CheckCheck className={cn(
                            "w-4 h-4",
                            isFilterActive('type') && isEnabled && "opacity-50"
                          )} />
                        </button>
                      </div>

                      <ScrollArea className="max-h-[320px] overflow-y-auto">
                        <div>
                          {Object.entries(DEBATE_TYPES).map(([house, types]) => (
                            <div key={house}>
                              <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                                {house === 'Commons' ? 'House of Commons' : 'House of Lords'}
                              </div>
                              {types.map(type => (
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
                                    filters['type'].includes(type.type) && [
                                      "bg-primary/10 text-primary hover:bg-primary/15",
                                      "after:bg-primary/20"
                                    ]
                                  )}
                                  onClick={() => {
                                    handleFilterChange(
                                      'type',
                                      filters['type'].includes(type.type)
                                        ? filters['type'].filter(t => t !== type.type)
                                        : [...filters['type'], type.type]
                                    );
                                  }}
                                >
                                  <span className="flex-1 font-medium">{type.label}</span>
                                  {filters['type'].includes(type.type) && (
                                    <Check className="w-4 h-4 shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {isFilterActive('type') && (
                        <div className="p-2 border-t bg-muted/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs font-medium hover:bg-muted"
                            onClick={() => {
                              handleFilterChange('type', []);
                              setOpen(prev => ({ ...prev, type: false }));
                            }}
                          >
                            Clear Type
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            </div>

            {isEnabled && filterItems
              .filter(filter => filter.type === 'array' && filter.id !== 'type')
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
                              <LayoutList className="w-4 h-4 text-muted-foreground" />
                              <h4 className="font-medium text-md">Type</h4>
                              {isFilterActive('type') && (
                                <Badge variant="secondary" className="ml-2">
                                  {filters['type'].length}
                                </Badge>
                              )}
                            </div>
                            <button
                              className={cn(
                                "h-8 w-8 rounded-md flex items-center justify-center",
                                "transition-colors",
                                isFilterActive('type') && isEnabled
                                  ? "bg-primary/10 text-primary hover:bg-primary/15" 
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => {
                                if (isEnabled) {
                                  // Toggle between all items and no items
                                  if (filters['type'].length === 0) {
                                    // Select all types
                                    const allTypes = Object.values(DEBATE_TYPES)
                                      .flatMap(types => types.map(t => t.type));
                                    handleFilterChange('type', allTypes);
                                  } else {
                                    // Clear selection
                                    handleFilterChange('type', []);
                                  }
                                }
                              }}
                              title={isFilterActive('type') ? "Clear all" : "Select all"}
                            >
                              <CheckCheck className={cn(
                                "w-4 h-4",
                                isFilterActive('type') && isEnabled && "opacity-50"
                              )} />
                            </button>
                          </div>

                          <ScrollArea className="max-h-[320px] overflow-y-auto">
                            <div>
                              {Object.entries(DEBATE_TYPES).map(([house, types]) => (
                                <div key={house}>
                                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                                    {house === 'Commons' ? 'House of Commons' : 'House of Lords'}
                                  </div>
                                  {types.map(type => (
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
                                        filters['type'].includes(type.type) && [
                                          "bg-primary/10 text-primary hover:bg-primary/15",
                                          "after:bg-primary/20"
                                        ]
                                      )}
                                      onClick={() => {
                                        handleFilterChange(
                                          'type',
                                          filters['type'].includes(type.type)
                                            ? filters['type'].filter(t => t !== type.type)
                                            : [...filters['type'], type.type]
                                        );
                                      }}
                                    >
                                      <span className="flex-1 font-medium">{type.label}</span>
                                      {filters['type'].includes(type.type) && (
                                        <Check className="w-4 h-4 shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>

                          {isFilterActive('type') && (
                            <div className="p-2 border-t bg-muted/30">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-xs font-medium hover:bg-muted"
                                onClick={() => {
                                  handleFilterChange('type', []);
                                  setOpen(prev => ({ ...prev, type: false }));
                                }}
                              >
                                Clear type
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
                        onClick={onUpgrade}
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

      <Dialog open={showDivisionsPrompt} onOpenChange={setShowDivisionsPrompt}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogTitle className="sr-only">
            Sign in to filter by divisions
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create an account or sign in to filter debates by divisions.
          </DialogDescription>
          <SignInPrompt
            title="Sign in to filter by divisions"
            description="Create an account or sign in to filter debates by divisions."
          />
        </DialogContent>
      </Dialog>

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
    </>
  );
} 