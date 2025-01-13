import { formatDistanceToNow } from 'date-fns';
import type { SavedSearch, SavedSearchSchedule } from '@/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download, Trash2, BellRing } from 'lucide-react';
import { useState } from 'react';
import { FormattedMarkdown } from '@/lib/utils';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { exportSearchToPDF } from '@/lib/pdf-utilities';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AISearchCardProps {
  search: SavedSearch & { 
    is_unread?: boolean;
    saved_search_schedules?: SavedSearchSchedule[];
  };
  onDelete: () => void;
  user: User | null;
}

export function AISearchCard({ search, onDelete, user }: AISearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportSearchToPDF(search);
    } catch (error) {
      console.error('Error exporting search:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your search",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Process citations if they exist
  const processedCitations = search.citations || [];
  const groupedCitations = processedCitations.reduce((acc, citation) => {
    const existing = acc.find(g => g.debate_id === citation.debate_id);
    if (existing) {
      existing.citations.push(citation);
    } else {
      acc.push({ debate_id: citation.debate_id, citations: [citation] });
    }
    return acc;
  }, [] as { debate_id: string; citations: typeof processedCitations }[]);

  const formatCitationIndexes = (citations: typeof processedCitations) => {
    return citations.map(c => `[${c.citation_index}]`).join(', ');
  };

  return (
    <Card className={cn(
      search.is_unread && "ring-2 ring-primary",
      "transition-all duration-200"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">
                {search.query}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {search.saved_search_schedules?.some(s => s.is_active) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BellRing className="h-4 w-4 text-primary" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Scheduled updates active
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Export to PDF
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Delete search
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert prose-sm max-w-none mb-4">
            <FormattedMarkdown 
              content={isOpen ? search.response : search.response.slice(0, 200) + '...'}
              citations={processedCitations}
            />
          </div>
          
          {isOpen && processedCitations.length > 0 && (
            <div className="mt-4 border-t pt-4 text-sm">
              <h4 className="font-medium mb-2">Sources</h4>
              <div className="space-y-2">
                {groupedCitations.map(({ debate_id, citations }) => (
                  <div key={debate_id} className="flex gap-2">
                    <span className="text-muted-foreground font-mono whitespace-nowrap">
                      {formatCitationIndexes(citations)}
                    </span>
                    <DebateHeader 
                      extId={debate_id} 
                      className="flex-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {search.response.length > 200 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full">
                {isOpen ? (
                  <div className="flex items-center">
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Show Less
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show More
                  </div>
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
} 