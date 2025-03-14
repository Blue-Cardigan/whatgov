'use client';

import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { saveSearch } from '@/lib/supabase/saved-searches';
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
import type { MPData, AiTopic } from '@/types';
import type { MPKeyPointDetails } from '@/lib/supabase/mpsearch';
import type { Citation, QueryState } from '@/types/search';

interface SaveSearchButtonProps {
  searchType: 'ai' | 'hansard' | 'mp';
  aiSearch?: {
    query: string;
    streamingText: string;
    citations: Citation[];
  };
  hansardSearch?: {
    query: string;
    response: {
      Debates: {
        debate_id: string;
      }[];
    };
    queryState?: QueryState;
  };
  mpSearch?: {
    query: string;
    mpData: MPData;
    keyPoints: MPKeyPointDetails[];
    topics: AiTopic[];
  };
}

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' }
] as const;

export function SaveSearchButton({ 
  searchType,
  aiSearch,
  hansardSearch
}: SaveSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDay, setRepeatDay] = useState<string>('1'); // Monday by default
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const repeat_on = repeatEnabled ? {
        dayOfWeek: parseInt(repeatDay, 10),
        frequency: 'weekly' as const,
      } : null;

      switch (searchType) {
        case 'ai':
          if (!aiSearch?.query.trim()) {
            throw new Error('Search query cannot be empty');
          }
          await saveSearch({
            query: aiSearch.query,
            response: aiSearch.streamingText,
            citations: aiSearch.citations.map(c => c.debate_id),
            searchType: 'ai',
            queryState: {},
            repeat_on
          }, toast);
          break;

        case 'hansard':
          if (!hansardSearch?.query.trim()) {
            throw new Error('Search query cannot be empty');
          }

          await saveSearch({
            query: hansardSearch.query,
            response: JSON.stringify(hansardSearch.response.Debates.map(debate => debate.debate_id)),
            citations: [].filter(Boolean),
            queryState: {
              house: hansardSearch.queryState?.house || undefined,
              member: hansardSearch.queryState?.member || undefined,
              party: hansardSearch.queryState?.party || undefined,
              date_from: hansardSearch.queryState?.date_from || undefined,
              date_to: hansardSearch.queryState?.date_to || undefined,
            },
            searchType: 'hansard',
            repeat_on
          }, toast);
          break;

        default:
          throw new Error('Unsupported search type');
      }

      toast({
        title: "Search saved",
        description: repeatEnabled 
          ? `Search will repeat every ${WEEKDAYS.find(d => d.value === repeatDay)?.label}` 
          : "You can find this in your saved searches",
        duration: 3000
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error saving search",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="hover:bg-muted flex gap-2 items-center"
        >
          <Bookmark className="h-4 w-4" />
          <span>Save this Search</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h4 className="font-medium">Save Search</h4>
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
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Search"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 