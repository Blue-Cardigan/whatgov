"use client";

import { cn, DAYS, DEBATE_TYPES, TOPICS } from "@/lib/utils";
import type { ArrayFilterItem, BooleanFilterItem, FeedFilters } from "@/types";
import { DebateFilters } from "../debates/DebateFilters";
import { 
  Calendar, 
  Tags, 
  LayoutList,
  UserIcon,
  Vote,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useMemo } from "react";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";

interface TopBarProps {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  className?: string;
}

// Update filterItems array to remove location and reorder type
export const filterItems = [
  {
    id: 'type' as const,
    icon: LayoutList,
    label: "Type",
    tier: 'premium' as const,
    description: "Filter by debate type",
    type: 'array' as const,
    options: [...DEBATE_TYPES.Commons, ...DEBATE_TYPES.Lords].map(({ type, label }) => ({
      value: type,
      label,
      icon: LayoutList
    }))
  },
  {
    id: 'topics' as const,
    icon: Tags,
    label: "Topics",
    tier: 'premium' as const,
    description: "Filter debates by topic areas",
    type: 'array' as const,
    options: TOPICS.map(topic => ({
      value: topic.label,
      label: topic.label,
      icon: topic.icon
    }))
  },
  {
    id: 'days' as const,
    icon: Calendar,
    label: "Days",
    tier: 'premium' as const,
    description: "Filter by days of the week",
    type: 'array' as const,
    options: DAYS.map(day => ({
      value: day,
      label: day,
      icon: Calendar
    }))
  }
] satisfies ArrayFilterItem[];

// Add boolean filters separately
export const booleanFilters = [
  {
    id: 'mpOnly' as const,
    icon: UserIcon,
    label: "My MP",
    tier: 'basic' as const,
    description: "Show only my MP's contributions",
    type: 'boolean' as const
  },
  {
    id: 'divisionsOnly' as const,
    icon: Vote,
    label: "Divisions",
    tier: 'premium' as const,
    description: "Show only division votes",
    type: 'boolean' as const
  }
] satisfies BooleanFilterItem[];

export function TopBar({ filters, onChange, className }: TopBarProps) {
  const { isEngagedCitizen, user, profile, loading } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Maintain local state of filters
  const [localFilters, setLocalFilters] = useState(filters);

  // Update local state when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Show available filters immediately based on current auth state
  const availableFilters = useMemo(() => {
    const basicFilters = filterItems.filter(f => f.tier !== 'premium');
    return loading ? basicFilters : (isEngagedCitizen ? filterItems : basicFilters);
  }, [isEngagedCitizen, loading]);

  const handleFilterChange = (updatedFilters: Omit<FeedFilters, 'house'>) => {
    // Don't process filter changes while loading
    if (loading) return;

    let newFilters = { ...filters };

    // Apply filter logic
    if (!user || !profile?.mp_id) {
      newFilters = {
        ...filters,
        ...updatedFilters,
        mpOnly: false
      };
    } else if (!isEngagedCitizen) {
      newFilters = {
        ...filters,
        mpOnly: updatedFilters.mpOnly,
        divisionsOnly: updatedFilters.divisionsOnly,
        type: [],
        days: [],
        topics: []
      };
    } else {
      newFilters = {
        ...filters,
        ...updatedFilters
      };
    }

    // Update local state immediately
    setLocalFilters(newFilters);
    // Propagate changes to parent
    onChange(newFilters);
  };

  // Initialize filters based on auth state
  useEffect(() => {
    if (!loading) {
      // If user is not authenticated or doesn't have an MP, reset mpOnly filter
      if ((!user || !profile?.mp_id) && filters.mpOnly) {
        onChange({
          ...filters,
          mpOnly: false
        });
        return;
      }

      // If user is not subscribed, reset premium filters only if they have values
      if (isEngagedCitizen === false && (
        filters.type.length > 0 ||
        filters.days.length > 0 ||
        filters.topics.length > 0
      )) {
        onChange({
          ...filters,
          type: [],
          days: [],
          topics: []
        });
      }
    }
  }, [loading, user, profile?.mp_id, isEngagedCitizen, filters, onChange]);

  // Don't render filters until auth state is determined
  if (loading) {
    return (
      <div className={cn(
        "w-full",
        "md:fixed md:right-8 md:w-14 md:top-0 md:h-auto",
        className
      )}>
        <DebateFilters 
          filters={omitHouse(localFilters)}
          onChange={handleFilterChange} 
          filterItems={[...availableFilters, ...booleanFilters]}
          isEnabled={true}
          onUpgrade={() => setShowUpgradeDialog(true)}
        />
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "w-full",
        "md:fixed md:right-8 md:w-14 md:top-0 md:h-auto",
        className
      )}>
        <DebateFilters 
          filters={omitHouse(localFilters)}
          onChange={handleFilterChange} 
          filterItems={[...availableFilters, ...booleanFilters]}
          isEnabled={isEngagedCitizen}
          onUpgrade={() => setShowUpgradeDialog(true)}
        />
      </div>

      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        title="Upgrade to Engaged Citizen"
        description="Access all advanced filtering options with an Engaged Citizen subscription."
      />
    </>
  );
}

// Helper function to omit the house property
function omitHouse(filters: FeedFilters): Omit<FeedFilters, 'house'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { house, ...rest } = filters;
  return rest;
}