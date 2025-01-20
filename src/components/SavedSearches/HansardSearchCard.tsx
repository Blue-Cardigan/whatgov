import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Download, Trash2, BellRing, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { DebateHeader } from '@/components/debates/DebateHeader';
import type { SavedSearch, SearchParams } from '@/types/search';
import { cn } from "@/lib/utils";
import { exportToPDF } from '@/lib/pdf-export';

const INITIAL_DISPLAY_COUNT = 3;

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' }
] as const;

export default function HansardSearchCard({
  search,
  onDelete,
  onScheduleUpdate,
  isProfessional
}: {
  search: SavedSearch;
  onDelete: () => void;
  onScheduleUpdate: (enabled: boolean, day: string) => Promise<void>;
  onExport: () => Promise<void>;
  isProfessional: boolean;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(search.saved_search_schedules?.some(s => s.is_active) || false);
  const [repeatDay, setRepeatDay] = useState<string>(search.saved_search_schedules?.[0]?.repeat_on?.dayOfWeek?.toString() || '1');
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  
  // Parse stored data
  const debateIds = JSON.parse(search.response) as string[];
  const queryState = search.query_state as SearchParams;

  const formatSearchContent = () => {
    const filters: string[] = [];
    
    // Add search filters
    if (queryState.house) filters.push(`House: **${queryState.house}**`);
    if (queryState.party) filters.push(`Party: **${queryState.party}**`);
    if (queryState.member) filters.push(`Member: **${queryState.member}**`);
    if (queryState.dateFrom && queryState.dateTo) {
      const dateFrom = new Date(queryState.dateFrom);
      const dateTo = new Date(queryState.dateTo);
      filters.push(`Date Range: **${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}**`);
    }

    // Format content with markdown
    return `# Search Information
Search Term: **${search.query}**
${filters.length > 0 ? '\n## Filters\n' + filters.join('\n') : ''}

## Results
Found ${debateIds.length} debates:

${debateIds.map((id, index) => `[${index + 1}] Debate: https://whatgov.co.uk/debate/${id}`).join('\n')}`;
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportToPDF({
        title: search.query,
        content: formatSearchContent(),
        date: new Date(search.created_at),
        citations: debateIds,
        searchType: 'hansard',
        markdown: true
      });
    } catch (error) {
      console.error('Error exporting search:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleScheduleChange = async () => {
    await onScheduleUpdate(repeatEnabled, repeatDay);
    setIsPopoverOpen(false);
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + INITIAL_DISPLAY_COUNT);
  };

  const renderQueryFilters = () => {
    const filters = [];
    
    if (queryState.house) {
      filters.push(<Badge key="house" variant="outline">{queryState.house}</Badge>);
    }
    if (queryState.party) {
      filters.push(<Badge key="party" variant="outline">{queryState.party}</Badge>);
    }
    if (queryState.member) {
      filters.push(<Badge key="member" variant="outline">{queryState.member}</Badge>);
    }
    if (queryState.dateFrom && queryState.dateTo) {
      const dateFrom = new Date(queryState.dateFrom);
      const dateTo = new Date(queryState.dateTo);
      filters.push(
        <Badge key="dates" variant="outline">
          {dateFrom.toLocaleDateString()} - {dateTo.toLocaleDateString()}
        </Badge>
      );
    }

    return filters;
  };

  const visibleDebates = debateIds.slice(0, displayCount);

  return (
    <Card className={cn(
      "transition-all duration-200",
      search.is_unread && "ring-2 ring-primary",
    )}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="font-medium">
              {search.query}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {renderQueryFilters()}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
              <span className="ml-2">• {debateIds.length} debates found</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={!isProfessional}>
                      <BellRing className="h-4 w-4" />
                    </Button>
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
                  {isProfessional ? 'Modify Schedule' : 'Professional Only'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
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
                    size="icon"
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
        <div className="space-y-4">
          {visibleDebates.map((debateId, index) => (
            <DebateHeader
              key={debateId}
              extId={debateId}
              className={cn(
                index !== 0 && "mt-4",
                index !== visibleDebates.length - 1 && "border-b pb-4"
              )}
            />
          ))}
          
          {debateIds.length > displayCount && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Show {Math.min(INITIAL_DISPLAY_COUNT, debateIds.length - displayCount)} more results
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}