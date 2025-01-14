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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { updateSearchSchedule } from '@/lib/supabase/saved-searches';

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

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' }
] as const;

export function HansardSearchCard({ search, relatedSearches, onDelete, user, compact }: HansardSearchCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(search.saved_search_schedules?.some(s => s.is_active) || false);
  const [repeatDay, setRepeatDay] = useState<string>(search.saved_search_schedules?.[0]?.repeat_on?.dayOfWeek?.toString() || '1');
  const { isProfessional } = useAuth();
  
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

  const handleScheduleChange = async () => {
    if (!user || !isProfessional) {
      toast({
        title: "Professional account required",
        description: "Please upgrade to a professional account to enable scheduled searches.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateSearchSchedule(search.id, user.id, {
        is_active: repeatEnabled,
        repeat_on: repeatEnabled ? {
          frequency: 'weekly',
          dayOfWeek: parseInt(repeatDay)
        } : null
      });

      setIsPopoverOpen(false);
      toast({
        title: "Schedule updated",
        description: repeatEnabled 
          ? `Search will repeat every ${WEEKDAYS.find(d => d.value === repeatDay)?.label}`
          : "Search schedule has been disabled",
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating the search schedule",
        variant: "destructive"
      });
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
              <TooltipProvider>
                <Tooltip>
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <BellRing className="h-4 w-4 text-primary cursor-pointer" />
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <div className="border-b pb-2">
                          <h4 className="font-medium">Modify Schedule</h4>
                        </div>
                        
                        <div className="flex items-center justify-between space-x-2">
                          <Label htmlFor="repeat-search" className="flex flex-col space-y-1">
                            <span>Repeat Search Weekly</span>
                            <span className="font-normal text-xs text-muted-foreground">
                              Automatically repeat this search every week
                            </span>
                          </Label>
                          <Switch
                            id="repeat-search"
                            checked={repeatEnabled}
                            onCheckedChange={setRepeatEnabled}
                          />
                        </div>

                        {repeatEnabled && (
                          <div className="space-y-2">
                            <Label htmlFor="repeat-day" className="text-sm">
                              Repeat on
                            </Label>
                            <Select
                              value={repeatDay}
                              onValueChange={setRepeatDay}
                            >
                              <SelectTrigger id="repeat-day" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {WEEKDAYS.map((day) => (
                                  <SelectItem key={day.value} value={day.value}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-2 border-t">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsPopoverOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleScheduleChange}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <TooltipContent>
                    Modify Schedule
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