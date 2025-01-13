import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeSlot } from "@/types/calendar";
import { Clock } from "lucide-react";
import { SessionPopover } from "./SessionPopover";

interface UntimedItemsProps {
  items: TimeSlot[];
}

export function UntimedItems({ items }: UntimedItemsProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-auto p-2 border-t bg-muted/30 relative z-10">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {items.length} unscheduled {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 max-h-[400px] overflow-y-auto" 
          align="start"
        >
          <div className="flex flex-col divide-y bg-card">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="p-2 hover:bg-muted/50 transition-colors"
              >
                <SessionPopover
                  session={item}
                  size="compact"
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 