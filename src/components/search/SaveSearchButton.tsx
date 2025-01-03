'use client';

import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { saveSearch } from '@/lib/supabase/saved-searches';
import { useToast } from '@/hooks/use-toast';
import type { MPData, AiTopic } from '@/types';
import type { MPKeyPointDetails } from '@/lib/supabase/mpsearch';
import type { Citation } from '@/types/search';

interface SaveSearchButtonProps {
  aiSearch?: {
    query: string;
    streamingText: string;
    citations: Citation[];
    queryState?: {
      searchTerm: string;
      startDate?: string;
      endDate?: string;
      house?: 'Commons' | 'Lords';
    };
  };
  hansardSearch?: {
    query: string;
    results: any;
    queryState: any;
  };
  mpSearch?: {
    query: string;
    mpData: MPData;
    keyPoints: MPKeyPointDetails[];
    topics: AiTopic[];
  };
  searchType: 'ai' | 'hansard' | 'mp';
}

export function SaveSearchButton({ 
  aiSearch, 
  hansardSearch, 
  mpSearch, 
  searchType 
}: SaveSearchButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);

      switch (searchType) {
        case 'ai':
          if (!aiSearch) break;
          await saveSearch({
            query: aiSearch.query,
            response: aiSearch.streamingText,
            citations: aiSearch.citations.map(c => c.chunk_text),
            queryState: aiSearch.queryState || {
              searchTerm: aiSearch.query,
              startDate: new Date('2024-07-04').toISOString(),
              endDate: new Date().toISOString()
            },
            searchType: 'ai'
          });
          break;

        case 'hansard':
          if (!hansardSearch) break;
          await saveSearch({
            query: hansardSearch.query,
            response: JSON.stringify(hansardSearch.results),
            citations: [],
            queryState: hansardSearch.queryState,
            searchType: 'hansard'
          });
          break;

        case 'mp':
          if (!mpSearch) break;
          await saveSearch({
            query: mpSearch.query,
            response: JSON.stringify({
              mpData: mpSearch.mpData,
              keyPoints: mpSearch.keyPoints,
              topics: mpSearch.topics
            }),
            citations: [],
            queryState: {
              searchTerm: mpSearch.query,
              startDate: new Date('2024-07-04').toISOString(),
              endDate: new Date().toISOString()
            },
            searchType: 'mp'
          });
          break;
      }

      toast({
        title: "Search saved",
        description: "You can find this in your saved searches"
      });
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        title: "Failed to save search",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleSave}
      disabled={isSaving}
      className="hover:bg-muted"
    >
      <Bookmark className="h-4 w-4" />
    </Button>
  );
} 