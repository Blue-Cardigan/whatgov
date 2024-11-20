"use client";

import { cn } from "@/lib/utils";
import { DebateFilters } from "../debates/DebateFilters";
import { 
  Calendar, 
  MapPin, 
  Tags, 
  BookText,
} from "lucide-react";

interface TopBarProps {
  filters: {
    type: string[];
    location: string[];
    days: string[];
    topics: string[];
  };
  onChange: (filters: TopBarProps['filters']) => void;
  className?: string;
}

const FILTER_ITEMS = [
  {
    id: 'type',
    icon: BookText,
    label: 'Type',
  },
  {
    id: 'location',
    icon: MapPin,
    label: 'Location',
  },
  {
    id: 'days',
    icon: Calendar,
    label: 'Days',
  },
  {
    id: 'topics',
    icon: Tags,
    label: 'Topics',
  },
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
        filterItems={FILTER_ITEMS}
      />
    </div>
  );
} 