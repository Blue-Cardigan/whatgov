import { DebateHeader } from '@/components/debates/DebateHeader';
import { cn } from '@/lib/utils';

interface CitationProps {
  citation: string;
  index?: number;
  className?: string;
  showNumber?: boolean;
}

export function Citation({ citation, index, className, showNumber = true }: CitationProps) {
  // Extract the extId from citation string (e.g., "[1] 123456.txt" -> "123456")
  const match = citation.match(/\[(\d+)\]\s+(.+?)\.txt$/);
  if (!match) return null;
  
  const [, citationNumber, extId] = match;

  return (
    <div className={cn("group transition-all", className)}>
      <div className="flex items-start gap-2">
        {showNumber && (
          <span className="text-sm text-muted-foreground font-mono mt-1">
            [{citationNumber}]
          </span>
        )}
        <div className="flex-1">
          <DebateHeader 
            extId={extId}
            className="border rounded-md hover:border-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

interface CitationsListProps {
  citations: string[];
  className?: string;
}

export function CitationsList({ citations, className }: CitationsListProps) {
  if (citations.length === 0) return null;

  return (
    <div className={cn("mt-6 pt-4 border-t space-y-4", className)}>
      <h3 className="text-sm font-semibold">Sources:</h3>
      <div className="space-y-3">
        {citations.map((citation, index) => (
          <Citation 
            key={index}
            citation={citation}
            index={index}
          />
        ))}
      </div>
    </div>
  );
} 