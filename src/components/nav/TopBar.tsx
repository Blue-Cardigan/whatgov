"use client";

import { cn } from "@/lib/utils";
import type { FeedFilters } from "@/types";
import { DebateFilters } from "../debates/DebateFilters";
import { 
  Calendar, 
  MapPin, 
  Tags, 
  LayoutList,
} from "lucide-react";

interface TopBarProps {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  className?: string;
}

export const filterItems = [
  {
    id: 'topics' as const,
    icon: Tags,
    label: "Topics"
  },
  {
    id: 'days' as const,
    icon: Calendar,
    label: "Days"
  },
  {
    id: 'type' as const,
    icon: LayoutList,
    label: "Type"
  },
  {
    id: 'location' as const,
    icon: MapPin,
    label: "Location"
  },
] as const;

export function TopBar({ filters, onChange, className }: TopBarProps) {
  const handleFilterChange = (updatedFilters: Omit<FeedFilters, 'house'>) => {
    onChange({
      ...filters,
      ...updatedFilters
    });
  };

  return (
    <div className={cn(
      "w-full",
      "md:fixed md:right-8 md:w-14 md:top-0 md:h-auto",
      className
    )}>
      <DebateFilters 
        filters={omitHouse(filters)}
        onChange={handleFilterChange} 
        filterItems={filterItems}
      />
    </div>
  );
}

// Helper function to omit the house property
function omitHouse(filters: FeedFilters): Omit<FeedFilters, 'house'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { house, ...rest } = filters;
  return rest;
} 