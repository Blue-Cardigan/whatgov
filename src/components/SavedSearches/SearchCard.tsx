import { formatDistanceToNow, format, addDays } from 'date-fns';
import type { SavedSearch } from '@/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download, Trash2, Clock, Bell, BellRing, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { FormattedMarkdown } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { constructHansardUrl } from '@/lib/utils';

interface SearchSchedule {
  id: string;
  is_active: boolean;
  repeat_on: {
    dayOfWeek: number;
    frequency: 'weekly';
  };
  next_run_at: string;
}

interface SearchCardProps {
  search: SavedSearch & { 
    is_unread?: boolean;
    saved_search_schedules?: SearchSchedule[];
  };
  onDelete: () => void;
}

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' }
] as const;

const createDefaultSchedule = (searchId: string, userId: string) => ({
  search_id: searchId,
  user_id: userId,
  is_active: true,
  repeat_on: {
    dayOfWeek: 1, // Monday
    frequency: 'weekly' as const
  },
  // Set next run to next Monday at 7am
  next_run_at: (() => {
    const date = new Date();
    const daysUntilMonday = (8 - date.getDay()) % 7;
    const nextMonday = addDays(date, daysUntilMonday);
    nextMonday.setHours(7, 0, 0, 0);
    return nextMonday.toISOString();
  })()
});

const renderHansardMetrics = (search: SavedSearch) => {
  if (!search.query_state || search.search_type !== 'hansard') return null;

  try {
    const response = JSON.parse(search.response);
    const { summary, searchTerms, firstResult, date } = response;

    return (
      <div className="space-y-4">
        {/* Search Summary */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Search Date: {format(new Date(date), 'PPP')}</span>
          </div>
          <div>
            Search Terms: {searchTerms.join(', ')}
          </div>
          {search.query_state.house && (
            <div>
              House: {search.query_state.house}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {summary.TotalContributions > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="font-medium">Contributions</div>
              <div className="text-2xl font-bold">{summary.TotalContributions}</div>
            </div>
          )}
          {summary.TotalDebates > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="font-medium">Debates</div>
              <div className="text-2xl font-bold">{summary.TotalDebates}</div>
            </div>
          )}
          {summary.TotalWrittenStatements > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="font-medium">Written Statements</div>
              <div className="text-2xl font-bold">{summary.TotalWrittenStatements}</div>
            </div>
          )}
        </div>

        {/* First Result Preview with Link */}
        {firstResult && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Latest Contribution</h4>
              <div className="flex items-center gap-2">
                <Link
                  href={`/debate/${firstResult.DebateSectionExtId}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
                >
                  View Debate
                  <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {firstResult.MemberName}
                <span className="text-muted-foreground ml-2">
                  ({firstResult.House} Chamber)
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {firstResult.DebateSection}
              </div>
              <div className="text-sm">
                {firstResult.ContributionText}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(firstResult.SittingDate), 'PPP')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error parsing Hansard response:', error);
    return (
      <div className="text-sm text-muted-foreground">
        Error displaying search results
      </div>
    );
  }
};

export function SearchCard({ search, onDelete }: SearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();

  const schedule = search.saved_search_schedules?.[0];
  const [isActive, setIsActive] = useState(schedule?.is_active ?? false);
  const [selectedDay, setSelectedDay] = useState(
    schedule?.repeat_on?.dayOfWeek?.toString() ?? '1'
  );

  const handleScheduleUpdate = async (updates: {
    is_active?: boolean;
    repeat_on?: { dayOfWeek: number; frequency: 'weekly' };
  }) => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    try {
      // Calculate next run date based on selected day
      const dayOfWeek = updates.repeat_on?.dayOfWeek ?? parseInt(selectedDay);
      const today = new Date();
      const daysUntilNext = (dayOfWeek - today.getDay() + 7) % 7;
      const nextRunDate = addDays(today, daysUntilNext);
      nextRunDate.setHours(7, 0, 0, 0); // Set to 7 AM

      if (!schedule) {
        // Create new schedule
        const { data: newSchedule, error: createError } = await supabase
          .from('saved_search_schedules')
          .insert([{
            ...createDefaultSchedule(search.id, user.id),
            ...updates,
            next_run_at: updates.is_active === false ? null : nextRunDate.toISOString(),
          }])
          .select()
          .single();

        if (createError) throw createError;
        
        // Update local state with new schedule
        search.saved_search_schedules = [newSchedule];
      } else {
        // Update existing schedule
        const { error: updateError } = await supabase
          .from('saved_search_schedules')
          .update({
            ...updates,
            next_run_at: updates.is_active === false ? null : nextRunDate.toISOString(),
          })
          .eq('id', schedule.id);

        if (updateError) throw updateError;
      }

      toast({
        title: schedule ? "Schedule updated" : "Schedule created",
        description: "Your search schedule has been saved successfully.",
      });

    } catch (error) {
      console.error('Failed to update schedule:', error);
      toast({
        title: "Update failed",
        description: "Failed to save the search schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const renderScheduleControls = () => {
    return (
      <TooltipProvider>
        <Tooltip>
          <Popover>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {schedule?.is_active ? (
                    <BellRing className="h-4 w-4 text-primary" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-medium">Repeat Settings</h4>
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="repeat-toggle" className="flex flex-col space-y-1">
                    <span>Repeat Weekly</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      {isActive && schedule?.next_run_at
                        ? `Next run: ${format(new Date(schedule.next_run_at), 'EEEE, MMMM d')}`
                        : 'Automatically repeat this search every week'}
                    </span>
                  </Label>
                  <Switch
                    id="repeat-toggle"
                    checked={isActive}
                    disabled={isUpdating}
                    onCheckedChange={(checked) => {
                      setIsActive(checked);
                      handleScheduleUpdate({ is_active: checked });
                    }}
                  />
                </div>

                {isActive && (
                  <div className="space-y-2">
                    <Label htmlFor="repeat-day">Repeat on</Label>
                    <Select
                      value={selectedDay}
                      disabled={isUpdating}
                      onValueChange={(value) => {
                        setSelectedDay(value);
                        handleScheduleUpdate({
                          repeat_on: {
                            dayOfWeek: parseInt(value),
                            frequency: 'weekly'
                          }
                        });
                      }}
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
              </div>
            </PopoverContent>
            <TooltipContent side="top">
              {schedule?.is_active 
                ? `Repeats ${WEEKDAYS.find(d => d.value === selectedDay)?.label}s` 
                : "Schedule repeat"}
            </TooltipContent>
          </Popover>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Process citations from the saved search
  const processedCitations = useMemo(() => {
    if (!search.citations) return [];
    
    try {
      let citationsArray = search.citations;
      if (typeof search.citations === 'string') {
        citationsArray = JSON.parse(search.citations);
      }
      
      if (!Array.isArray(citationsArray)) return [];

      return citationsArray.map((citation, index) => ({
        debate_id: typeof citation === 'string' ? citation : citation?.debate_id,
        citation_index: index + 1 // Add sequential citation indexes
      })).filter(c => c.debate_id); // Filter out invalid citations
    } catch (e) {
      console.error('Failed to process citations:', e);
      return [];
    }
  }, [search.citations]);

  // Group citations by debate_id for the sources list
  const groupedCitations = useMemo(() => {
    return processedCitations.reduce((acc, citation) => {
      const existing = acc.find(g => g.debate_id === citation.debate_id);
      if (existing) {
        existing.citations.push(citation);
      } else {
        acc.push({ 
          debate_id: citation.debate_id, 
          citations: [citation] 
        });
      }
      return acc;
    }, [] as { debate_id: string; citations: typeof processedCitations }[]);
  }, [processedCitations]);

  // Format citation indexes (e.g., "1-3, 5")
  const formatCitationIndexes = (citations: typeof processedCitations) => {
    if (!citations?.length) return '';
    
    const indexes = citations
      .map(c => c.citation_index)
      .filter(Boolean)
      .sort((a, b) => a - b);

    const ranges: string[] = [];
    let start = indexes[0];
    let prev = start;

    for (let i = 1; i <= indexes.length; i++) {
      if (indexes[i] !== prev + 1) {
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = indexes[i];
      }
      prev = indexes[i];
    }

    return `【${ranges.join(', ')}】`;
  };

  return (
    <Card className={search.is_unread ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">
                {search.query}
              </CardTitle>
              {search.is_unread && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  New
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {renderScheduleControls()}
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent>
          {search.search_type === 'ai' ? (
            <>
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
            </>
          ) : (
            renderHansardMetrics(search)
          )}
        </CardContent>

        {search.response.length > 200 && search.search_type === 'ai' && (
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
      </Collapsible>
    </Card>
  );
} 