import { formatDistanceToNow, format } from 'date-fns';
import type { SavedSearch, SavedSearchSchedule } from '@/types/search';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, BellRing, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
import Link from 'next/link';
import { useState } from 'react';

interface HansardSearchCardProps {
  search: SavedSearch & { 
    is_unread?: boolean;
    saved_search_schedules?: SavedSearchSchedule[];
  };
  relatedSearches: SavedSearch[];
  onDelete: () => void;
  user: User | null;
  compact?: boolean;
}

interface HansardResponse {
  summary: {
    TotalMembers: number;
    TotalContributions: number;
    // ... other summary fields
  };
  searchTerms: string[];
  firstResult?: {
    MemberName: string;
    ContributionText: string;
    DebateSection: string;
    DebateSectionExtId: string;
    SittingDate: string;
    Section: string;
    AttributedTo: string;
  };
  date: string;
}

export function HansardSearchCard({ search, relatedSearches, onDelete, user, compact }: HansardSearchCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const allSearches = [search, ...relatedSearches].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  const currentSearch = allSearches[currentIndex];
  const hasMultiple = allSearches.length > 1;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportSearchToPDF(currentSearch);
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

  if (!currentSearch.query_state || currentSearch.search_type !== 'hansard') return null;

  try {
    const response = JSON.parse(currentSearch.response) as HansardResponse;
    const { summary, firstResult } = response;

    return (
      <Card className={cn(
        currentSearch.is_unread && "ring-2 ring-primary",
        compact && "p-4",
        "transition-all duration-200"
      )}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className={cn(
                "font-medium",
                compact ? "text-sm" : "text-base"
              )}>
                {currentSearch.query}
              </CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(currentSearch.created_at), { addSuffix: true })}
                </p>
                {firstResult?.DebateSectionExtId && (
                  <Link
                    href={`/debate/${firstResult.DebateSectionExtId}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    View Debate
                    <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentSearch.saved_search_schedules?.some(s => s.is_active) && (
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

          {/* Content */}
          {firstResult && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>{firstResult.Section}</span>
                <span>{format(new Date(firstResult.SittingDate), 'PPP')}</span>
              </div>
              <div className="space-y-1">
                <p className="font-medium">{firstResult.DebateSection}</p>
                <p className="text-muted-foreground">{firstResult.AttributedTo}</p>
                <p>{firstResult.ContributionText}</p>
              </div>
              <p className="text-muted-foreground text-xs">
                Found {summary.TotalContributions} contribution{summary.TotalContributions !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Navigation */}
          {hasMultiple && (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIndex(i => i - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {allSearches.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIndex(i => i + 1)}
                disabled={currentIndex === allSearches.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  } catch (error) {
    console.error('Error parsing Hansard response:', error);
    return null;
  }
} 