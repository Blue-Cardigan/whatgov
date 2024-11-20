"use client";

import { cn } from "@/lib/utils";
import { DebateFilters } from "../debates/DebateFilters";
import { 
  Calendar, 
  MapPin, 
  Tags, 
  LayoutList,
} from "lucide-react";

interface TopBarProps {
  filters: {
    type: string[];
    location: string[];
    days: string[];
    topics: string[];
    mpOnly: boolean;
  };
  onChange: (filters: TopBarProps['filters']) => void;
  className?: string;
}

export const filterItems = [
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
  {
    id: 'days' as const,
    icon: Calendar,
    label: "Days"
  },
  {
    id: 'topics' as const,
    icon: Tags,
    label: "Topics"
  }
] as const;

export function TopBar({ filters, onChange, className }: TopBarProps) {
  return (
    <div className={cn(
      "w-full",
      // Desktop: Fixed to right side, aligned to top
      "md:fixed md:right-8 md:w-14 md:top-0 md:h-auto",
      className
    )}>
      <DebateFilters 
        filters={filters} 
        onChange={onChange} 
        filterItems={filterItems}
      />
    </div>
  );
} 