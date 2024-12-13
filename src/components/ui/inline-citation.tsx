'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DebateHeader } from '@/components/debates/DebateHeader';
import { useState } from 'react';
import { Citation } from '@/types/search';

interface InlineCitationProps {
  citation: Citation;
  className?: string;
}

export function InlineCitation({ citation, className }: InlineCitationProps) {
  const [isOpen, setIsOpen] = useState(false);

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
            【{citation.citation_index}】
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="w-[400px] p-2"
          onPointerDownOutside={() => setIsOpen(false)}
        >
          <DebateHeader 
            extId={citation.debate_id}
            className="border rounded-md bg-background"
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 