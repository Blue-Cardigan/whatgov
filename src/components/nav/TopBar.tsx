"use client";

import { cn, DAYS, DEBATE_TYPES, TOPICS, locationColors } from "@/lib/utils";
import type { ArrayFilterItem, BooleanFilterItem, FeedFilters } from "@/types";
import { DebateFilters } from "../debates/DebateFilters";
import { 
  Calendar, 
  MapPin, 
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

// Enhanced filter items with access level information
export const filterItems = [
  {
    id: 'location' as const,
    icon: MapPin,
    label: "Location",
    tier: 'premium' as const,
    description: "Filter by parliamentary location",
    type: 'array' as const,
    options: Object.entries(locationColors).map(([location, color]) => ({
      value: location,
      label: location,
      color: color as string,
      icon: MapPin
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
  },
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

  // Show available filters immediately based on current auth state
  const availableFilters = useMemo(() => {
    const basicFilters = filterItems.filter(f => f.tier !== 'premium');
    return loading ? basicFilters : (isEngagedCitizen ? filterItems : basicFilters);
  }, [isEngagedCitizen, loading]);

  const handleFilterChange = (updatedFilters: Omit<FeedFilters, 'house'>) => {
    // Don't process filter changes while loading
    if (loading) return;

    // If user is not authenticated or doesn't have an MP, ignore mpOnly filter
    if (!user || !profile?.mp_id) {
      onChange({
        ...filters,
        ...updatedFilters,
        mpOnly: false
      });
      return;
    }

    // If user is not subscribed, only allow mpOnly and divisionsOnly filters
    if (!isEngagedCitizen) {
      onChange({
        ...filters,
        mpOnly: updatedFilters.mpOnly,
        divisionsOnly: updatedFilters.divisionsOnly,
        type: [],
        location: [],
        days: [],
        topics: []
      });
      return;
    }

    // Otherwise apply all filters
    onChange({
      ...filters,
      ...updatedFilters
    });
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
        filters.location.length > 0 ||
        filters.days.length > 0 ||
        filters.topics.length > 0
      )) {
        onChange({
          ...filters,
          type: [],
          location: [],
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
          filters={omitHouse(filters)}
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
          filters={omitHouse(filters)}
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