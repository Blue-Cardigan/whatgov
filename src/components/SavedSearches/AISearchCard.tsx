import { formatDistanceToNow } from 'date-fns';
import type { SavedSearch, SavedSearchSchedule } from '@/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download, Trash2, BellRing, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { FormattedMarkdown } from '@/lib/utils';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { exportToPDF } from '@/lib/pdf-export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

interface AISearchCardProps {
  search: SavedSearch & { 
    is_unread?: boolean;
    saved_search_schedules?: SavedSearchSchedule[];
  };
  relatedSearches: SavedSearch[];
  onDelete: () => void;
  user: User | null;
}

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' }
] as const;

export function AISearchCard({ search, relatedSearches, onDelete, user }: AISearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(search.saved_search_schedules?.some(s => s.is_active) || false);
  const [repeatDay, setRepeatDay] = useState<string>(search.saved_search_schedules?.[0]?.repeat_on?.dayOfWeek?.toString() || '1');
  const { isProfessional } = useAuth();
  const router = useRouter();

  const allSearches = useMemo(() => 
    [search, ...relatedSearches].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ), [search, relatedSearches]
  );
  
  const currentSearch = allSearches[currentIndex];
  const hasMultiple = allSearches.length > 1;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      await exportToPDF({
        title: currentSearch.query,
        content: currentSearch.response,
        date: new Date(currentSearch.created_at),
        citations: currentSearch.citations || [],
        searchType: 'ai',
        markdown: true // Enable markdown processing for AI search results
      });

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

  // Process citations if they exist
  const processedCitations = search.citations || [];
  const groupedCitations = processedCitations.map((debate_id: string, index: number) => ({
    debate_id,
    citation_index: index + 1
  }));

  return (
    <Card className={cn(
      currentSearch.is_unread && "ring-2 ring-primary",
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
                        
                        {isProfessional ? (
                          <>
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
                          </>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex flex-col space-y-2">
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
                                  disabled
                                />
                              </div>

                              {search.saved_search_schedules?.[0]?.repeat_on && (
                                <div className="mt-2 p-3 bg-muted rounded-md">
                                  <p className="text-sm text-muted-foreground">
                                    This search is set to repeat every{' '}
                                    {WEEKDAYS.find(d => d.value === repeatDay)?.label}, but is currently inactive.
                                  </p>
                                </div>
                              )}

                              <p className="text-sm text-muted-foreground mt-4">
                                Upgrade to a Professional account to enable scheduled searches.
                              </p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Automatically repeat searches weekly</li>
                                <li>Get notified of new results</li>
                                <li>Choose your preferred day for updates</li>
                              </ul>
                            </div>
                            <div className="flex justify-end pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setIsPopoverOpen(false);
                                  router.push('/account/upgrade');
                                }}
                              >
                                Upgrade Now
                              </Button>
                            </div>
                          </div>
                        )}
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
                    disabled={isExporting || !isProfessional}
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
              content={isOpen ? currentSearch.response : currentSearch.response.slice(0, 200) + '...'}
              citations={groupedCitations}
            />
          </div>
          
          {isOpen && processedCitations.length > 0 && (
            <div className="mt-4 border-t pt-4 text-sm">
              <h4 className="font-medium mb-2">Sources</h4>
              <div className="space-y-2">
                {groupedCitations.map(({ debate_id, citation_index }) => (
                  <div key={`${debate_id}-${citation_index}`} className="flex gap-2">
                    <span className="text-muted-foreground font-mono whitespace-nowrap">
                      [{citation_index}]
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

          <div className="flex items-center justify-between mt-4">
            {currentSearch.response.length > 200 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost">
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

            {/* Navigation controls */}
            {hasMultiple && (
              <div className="flex items-center gap-4 ml-auto">
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
        </CardContent>
      </Collapsible>
    </Card>
  );
} 