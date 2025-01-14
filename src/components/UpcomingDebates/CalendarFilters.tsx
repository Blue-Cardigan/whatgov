import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal } from "lucide-react";
import { useCallback } from "react";

export interface EventFilters {
  'Oral Questions': boolean;
  'Oral evidence': boolean;
  'Main Chamber': boolean;
  'Westminster Hall': boolean;
  'Private Meeting': boolean;
  'Introduction(s)': boolean;
  'Orders and Regulations': boolean;
  'Private Members\' Bills': boolean;
  'Legislation': boolean;
  'Bills': boolean;
  'EDMs': boolean;
  'Ministerial Statement': boolean;
  'Backbench Business': boolean;
}

interface CalendarFiltersProps {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
}

export function CalendarFilters({ filters, onChange }: CalendarFiltersProps) {
  const handleToggle = useCallback((key: keyof EventFilters) => {
    onChange({
      ...filters,
      [key]: !filters[key]
    });
  }, [filters, onChange]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 relative"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {/* Show dot when some filters are disabled */}
          {Object.values(filters).some(v => !v) && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show Events</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={filters["Oral Questions"]}
          onCheckedChange={() => handleToggle("Oral Questions")}
        >
          Oral Questions
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Main Chamber"]}
          onCheckedChange={() => handleToggle("Main Chamber")}
        >
          Main Chamber
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Westminster Hall"]}
          onCheckedChange={() => handleToggle("Westminster Hall")}
        >
          Westminster Hall
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Introduction(s)"]}
          onCheckedChange={() => handleToggle("Introduction(s)")}
        >
          Introduction(s)
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Orders and Regulations"]}
          onCheckedChange={() => handleToggle("Orders and Regulations")}
        >
          Orders and Regulations
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Private Members' Bills"]}
          onCheckedChange={() => handleToggle("Private Members' Bills")}
        >
          Private Members&apos; Bills
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Legislation"]}
          onCheckedChange={() => handleToggle("Legislation")}
        >
          Legislation
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Oral evidence"]}
          onCheckedChange={() => handleToggle("Oral evidence")}
        >
          Oral Evidence
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["Private Meeting"]}
          onCheckedChange={() => handleToggle("Private Meeting")}
        >
          Private Meetings
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={filters["Bills"]}
          onCheckedChange={() => handleToggle("Bills")}
        >
          Bills
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={filters["EDMs"]}
          onCheckedChange={() => handleToggle("EDMs")}
        >
          Early Day Motions
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 