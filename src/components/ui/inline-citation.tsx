import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DebateHeader } from '@/components/debates/DebateHeader';
import { useState } from 'react';

interface InlineCitationProps {
  index: number;
  citation: string;
  className?: string;
}

export function InlineCitation({ index, citation, className }: InlineCitationProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Extract the extId from citation string (e.g., "[1] 123456.txt" -> "123456")
  const match = citation.match(/\[(\d+)\]\s+(.+?)\.txt$/);
  if (!match) return null;
  const extId = match[2];

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center text-primary hover:text-primary/80",
              "rounded px-1 -mx-1 hover:bg-primary/10 transition-colors",
              className
            )}
          >
            [{index + 1}]
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="w-[400px] p-2"
          onPointerDownOutside={() => setIsOpen(false)}
        >
          <DebateHeader 
            extId={extId}
            className="border rounded-md bg-background"
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 