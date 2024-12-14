import { formatDistanceToNow, format } from 'date-fns';
import type { SavedSearch } from '@/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download, Trash2, Clock, Bell, BellOff } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { exportToPDF } from '@/lib/pdf-export';
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

interface SearchCardProps {
  search: SavedSearch;
  onDelete: () => void;
}

interface SearchSchedule {
  id: string;
  repeat_on: {
    frequency: 'weekly';
    dayOfWeek: number;
  };
  next_run_at: string;
  is_active: boolean;
}

export function SearchCard({ search, onDelete }: SearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [schedule, setSchedule] = useState<SearchSchedule | null>(null);
  const [showSchedulePopover, setShowSchedulePopover] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1);
  const router = useRouter();
  const supabase = useSupabase();
  const { isEngagedCitizen, user } = useAuth();

  // Only show weekdays
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Fetch schedule on mount
  useEffect(() => {
    async function fetchSchedule() {
      const { data } = await supabase
        .from('saved_search_schedules')
        .select('*')
        .eq('search_id', search.id)
        .single();
      
      if (data) {
        setSchedule(data);
        setSelectedDay(data.repeat_on.dayOfWeek);
      }
    }

    if (isEngagedCitizen) {
      fetchSchedule();
    }
  }, [search.id, supabase, isEngagedCitizen]);

  const handleScheduleUpdate = async () => {
    try {
      if (schedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('saved_search_schedules')
          .update({
            repeat_on: {
              frequency: 'weekly',
              dayOfWeek: selectedDay
            },
            is_active: true
          })
          .eq('id', schedule.id);

        if (error) throw error;
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('saved_search_schedules')
          .insert({
            search_id: search.id,
            user_id: user?.id || '',
            repeat_on: {
              frequency: 'weekly',
              dayOfWeek: selectedDay
            },
            is_active: true
          });

        if (error) throw error;
      }

      // Refresh schedule data
      const { data } = await supabase
        .from('saved_search_schedules')
        .select('*')
        .eq('search_id', search.id)
        .single();

      setSchedule(data);
      setShowSchedulePopover(false);
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  };

  const toggleScheduleActive = async () => {
    if (!schedule) return;

    try {
      const { error } = await supabase
        .from('saved_search_schedules')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;

      setSchedule(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const handleSearchAgain = () => {
    const searchState = {
      searchType: search.search_type,
      ...(search.search_type === 'ai' 
        ? {
            aiSearch: {
              query: search.query,
              streamingText: '', // Clear the streaming text
              citations: [], // Clear the citations
              isLoading: true // Set loading to true to trigger search
            }
          }
        : {
            searchParams: {
              ...search.query_state,
              searchTerm: search.query,
              skip: 0,
              take: 10,
              orderBy: 'SittingDateDesc'
            },
            results: null, // Clear the results to trigger new search
            isLoading: true // Set loading to true to trigger search
          }
      )
    };
    
    sessionStorage.setItem('searchState', JSON.stringify(searchState));
    router.push(`/search?tab=${search.search_type}&execute=true`);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportToPDF({
        title: search.query,
        content: search.response,
        citations: processedCitations,
        date: new Date(search.created_at),
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderHansardMetrics = () => {
    if (search.search_type !== 'hansard' || !search.query_state) return null;
    
    const results = JSON.parse(search.response) || {};
    const metrics = [
      { label: 'Total Contributions', value: results.TotalContributions },
      { label: 'Total Debates', value: results.TotalDebates },
      { label: 'Written Statements', value: results.TotalWrittenStatements },
      { label: 'Written Answers', value: results.TotalWrittenAnswers },
    ];

    return (
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        {metrics.map(({ label, value }) => (
          <div key={label} className="bg-muted p-2 rounded">
            <div className="font-medium">{label}</div>
            <div className="text-muted-foreground">{value || 0}</div>
          </div>
        ))}
      </div>
    );
  };

  // Process citations from the saved search
  const processedCitations = useMemo(() => {
    if (!search.citations) return [];
    
    return search.citations.map(citation => {
      if (typeof citation === 'string') {
        try {
          return JSON.parse(citation);
        } catch (e) {
          console.error('Failed to parse citation:', e);
          return null;
        }
      }
      return citation;
    }).filter(Boolean);
  }, [search.citations]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{search.query}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
              </p>
              {schedule && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Next run: {format(new Date(schedule.next_run_at), 'EEE, MMM d, h:mm a')}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isEngagedCitizen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Popover open={showSchedulePopover} onOpenChange={setShowSchedulePopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={schedule?.is_active ? 'text-primary' : ''}
                        >
                          {schedule?.is_active ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <BellOff className="h-4 w-4" />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium">Schedule Recurring Search</h4>
                          <p className="text-sm text-muted-foreground">
                            Choose which weekday to repeat this search
                          </p>
                          <Select
                            value={selectedDay.toString()}
                            onValueChange={(value) => setSelectedDay(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select weekday" />
                            </SelectTrigger>
                            <SelectContent>
                              {dayNames.map((day, index) => (
                                <SelectItem key={index + 1} value={(index + 1).toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex justify-end gap-2">
                            {schedule && (
                              <Button
                                variant="outline"
                                onClick={toggleScheduleActive}
                              >
                                {schedule.is_active ? 'Pause' : 'Resume'}
                              </Button>
                            )}
                            <Button onClick={handleScheduleUpdate}>
                              {schedule ? 'Update Schedule' : 'Save Schedule'}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TooltipTrigger>
                  <TooltipContent>
                    {schedule?.is_active 
                      ? 'Manage recurring search' 
                      : 'Schedule recurring search'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete saved search?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your saved search.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </TooltipTrigger>
                <TooltipContent>
                  Delete search
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {search.search_type === 'ai' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
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
            )}
            <Button variant="secondary" onClick={handleSearchAgain}>
              Search Again
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {search.search_type === 'ai' ? (
            <div className="prose dark:prose-invert prose-sm max-w-none mb-4">
              <FormattedMarkdown 
                content={isOpen ? search.response : search.response.slice(0, 200) + '...'}
                citations={processedCitations}
              />
            </div>
          ) : (
            renderHansardMetrics()
          )}

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
      </CardContent>
    </Card>
  );
} 