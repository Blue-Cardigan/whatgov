'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import Link from 'next/link';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import createClient from '@/lib/supabase/client';
import { RSSFeeds } from './RSSFeeds';
import { WeeklyContentSkeleton } from './WeeklyContentSkeleton';
import { BookmarkIcon } from 'lucide-react';
import { saveDebate, deleteDebate, isDebateSaved } from '@/lib/supabase/saved-debates';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';
import { getNextParliamentImage } from '@/lib/utils/parliamentImages';
import { WeeklySummary } from './WeeklySummary';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { Badge } from '@/components/ui/badge';

interface Debate {
  ext_id: string;
  title: string;
  type: string;
  house: string;
  date: string;
  analysis: {
    main_points: string;
  };
}

interface DebatesByType {
  [key: string]: Debate[];
}

interface WeeklySummary {
  week_start: string;
  week_end: string;
  summary: string;
  highlights: {
    date: string;
    type: string;
    title: string;
    summary: string;
  }[];
  citations: string[] | null;
}

function matchHighlightsWithCitations(
  highlights: WeeklySummary['highlights'],
  citations: string[] | null
): WeeklySummary['highlights'] {
  if (!citations) return [];

  return highlights.filter((highlight, index) => {
    // First try to get debate ID from the date field
    const dateMatch = highlight.date.match(/【\d+:\d+†debate-([A-F0-9-]+)\.txt】/);
    const debateId = dateMatch ? dateMatch[1] : null;

    if (debateId) {
      // If we have a debate ID in the date field, check if it matches any citation
      return citations.includes(debateId);
    } else {
      // If no debate ID in date field, use the citation at the same index as fallback
      return citations[index] !== undefined;
    }
  }).map((highlight, index) => {
    // If highlight doesn't have a debate ID in its date, inject it from citations
    const dateMatch = highlight.date.match(/【\d+:\d+†debate-([A-F0-9-]+)\.txt】/);
    if (!dateMatch && citations[index]) {
      // Replace the date field with properly formatted debate ID
      return {
        ...highlight,
        date: `2025-01-13 12:00:00+00:00 【4:${index + 1}†debate-${citations[index]}.txt】`
      };
    }
    return highlight;
  });
}

export function ThisWeek() {
  const [isLoading, setIsLoading] = useState(true);
  const [debatesByType, setDebatesByType] = useState<DebatesByType>({});
  const [savedDebates, setSavedDebates] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  const displayedTypes = useMemo(() => {
    if (!debatesByType) return [];
    
    const types = Object.entries(debatesByType)
      .map(([type, debates]) => ({ type, debates }))
      .filter(({ debates }) => debates.length > 0);

    // Prioritize PMQs
    const pmqsIndex = types.findIndex(({ type }) => type === "Prime Minister's Questions");
    if (pmqsIndex !== -1) {
      const pmqs = types.splice(pmqsIndex, 1)[0];
      types.unshift(pmqs);
    }

    // Combine General Debate and Debated Motion
    const debateIndex = types.findIndex(({ type }) => type === 'General Debate');
    const motionIndex = types.findIndex(({ type }) => type === 'Debated Motion');
    if (debateIndex !== -1 || motionIndex !== -1) {
      const combinedDebates = [];
      if (debateIndex !== -1) combinedDebates.push(...types.splice(debateIndex, 1)[0].debates);
      if (motionIndex !== -1) combinedDebates.push(...types.splice(motionIndex, 1)[0].debates);
      if (combinedDebates.length > 0) {
        types.push({ type: 'Top Debates', debates: combinedDebates });
      }
    }

    return types.slice(0, 4);
  }, [debatesByType]);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      // Fetch weekly summary
      const { data: weeklySummary, error: summaryError } = await supabase
        .from('frontpage_weekly')
        .select('*')
        .eq('is_published', true)
        .order('week_start', { ascending: false })
        .limit(1)
        .single();

      if (summaryError) {
        console.error('Error fetching weekly summary:', summaryError);
      } else {
        // Process highlights before setting the summary
        const processedSummary = {
          ...weeklySummary,
          highlights: matchHighlightsWithCitations(
            weeklySummary.highlights,
            weeklySummary.citations
          )
        };
        setSummary(processedSummary);
      }

      // Fetch debates for the current week
      const currentDate = new Date();
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

      const { data: debates } = await supabase
        .from('debates_new')
        .select('ext_id, title, type, house, date, analysis')
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString())
        .order('date', { ascending: false });

      if (debates) {
        const grouped = debates.reduce((acc: DebatesByType, debate) => {
          if (!acc[debate.type]) {
            acc[debate.type] = [];
          }
          acc[debate.type].push(debate);
          return acc;
        }, {});

        setDebatesByType(grouped);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  useEffect(() => {
    const checkSavedStatus = async () => {
      const debateIds = displayedTypes.flatMap(({ debates }) => 
        debates.map(d => d.ext_id)
      );
      
      for (const id of debateIds) {
        const isSaved = await isDebateSaved(id);
        if (isSaved) {
          setSavedDebates(prev => new Set([...prev, id]));
        }
      }
    };

    if (!isLoading && displayedTypes.length > 0) {
      checkSavedStatus();
    }
  }, [displayedTypes, isLoading]);

  const handleSaveToggle = async (debate: Debate) => {
    try {
      if (savedDebates.has(debate.ext_id)) {
        await deleteDebate(debate.ext_id);
        setSavedDebates(prev => {
          const next = new Set(prev);
          next.delete(debate.ext_id);
          return next;
        });
        toast({
          title: 'Debate removed from saved items',
          variant: 'destructive',
        });
      } else {
        await saveDebate({
          ext_id: debate.ext_id,
          title: debate.title,
          type: debate.type,
          house: debate.house,
          date: debate.date
        });
        setSavedDebates(prev => new Set([...prev, debate.ext_id]));
        toast({
          title: 'Debate saved successfully',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: 'Failed to save debate',
        variant: 'destructive',
      });
    }
  };

  // Modified component to handle image placement
  const HighlightCard = ({ highlight, index }: { highlight: WeeklySummary['highlights'][0], index: number }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const dateMatch = highlight?.date.match(/【\d+:\d+†debate-([A-F0-9-]+)\.txt】/);
    const debateId = dateMatch ? dateMatch[1] : null;
    
    useEffect(() => {
      let mounted = true;
      
      const loadImage = async () => {
        const url = await getNextParliamentImage();
        if (mounted) {
          setImageUrl(url);
        }
      };
      
      loadImage();
      
      return () => {
        mounted = false;
      };
    }, []);

    if (!highlight) {
      return <div className="w-full h-[200px] bg-muted rounded-lg animate-pulse" />;
    }

    // Determine if image should be above or below based on index
    const showImageAbove = index === 1 || index === 2;

    const ImageComponent = () => (
      imageUrl ? (
        <div className="relative h-[200px] w-full overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt="Parliament"
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-[200px] bg-muted rounded-lg animate-pulse" />
      )
    );

    return (
      <div className="space-y-4">
        {showImageAbove && <ImageComponent />}

        {debateId ? (
          <DebateHeader 
            key={index}
            extId={debateId}
            summaryText={highlight.summary}
          />
        ) : (
          <div className="w-full border-l-[6px] bg-background rounded-md flex flex-col gap-2 p-4"
               style={{ borderLeftColor: '#2b2b2b', borderLeftStyle: 'solid' }}>
            <h1 className="text-lg sm:text-xl font-bold text-foreground line-clamp-2">
              {highlight.title}
            </h1>
            <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs font-normal w-fit">
                {highlight.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{highlight.summary}</p>
          </div>
        )}

        {!showImageAbove && <ImageComponent />}
      </div>
    );
  };

  if (isLoading) {
    return <WeeklyContentSkeleton />;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-2 logo-font">THIS WEEK IN PARLIAMENT</h1>
        <div className="h-px bg-primary w-full mb-3" />
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4">
        {/* Left Column */}
        <div className="space-y-6">
          {[0, 1].map((index) => (
            <HighlightCard 
              key={index}
              highlight={summary?.highlights[index] as WeeklySummary['highlights'][0]}
              index={index}
            />
          ))}
        </div>

        {/* Center Column */}
        <div className="space-y-6">
          {summary && (
            <WeeklySummary 
              summary={summary} 
              usedDebateIds={summary.highlights
                .slice(0, 4)
                .map(h => h.date.match(/【\d+:\d+†debate-([A-F0-9-]+)\.txt】/)?.[1])
                .filter(Boolean) as string[]}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {[2, 3].map((index) => (
            <HighlightCard 
              key={index}
              highlight={summary?.highlights[index] as WeeklySummary['highlights'][0]}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* RSS Feeds Row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <RSSFeeds type="bills" />
        <RSSFeeds type="events" />
      </div>

      {/* Secondary Debates Row - can be removed or kept based on preference */}
    </div>
  );
}      