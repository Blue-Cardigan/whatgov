'use client';

import { useEffect, useState } from 'react';
import createClient from '@/lib/supabase/client';
import { RSSFeeds } from './RSSFeeds';
import { WeeklyContentSkeleton } from './WeeklyContentSkeleton';
import Image from 'next/image';
import { getNextParliamentImage } from '@/lib/utils/parliamentImages';
import { WeeklySummary } from './WeeklySummary';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { Badge } from '@/components/ui/badge';

interface WeeklySummary {
  week_start: string;
  week_end: string;
  remarks: string;
  highlights: {
    type: string;
    title: string;
    remarks: string;
    source: string;
  }[];
  citations: string[] | null;
}

function matchHighlightsWithCitations(
  highlights: WeeklySummary['highlights'],
  citations: string[] | null
): WeeklySummary['highlights'] {
  if (!citations || !highlights) return [];

  // If arrays are same length, use simple mapping
  if (highlights.length === citations.length) {
    return highlights.map((highlight, index) => ({
      ...highlight,
      // Clean the remarks by removing any existing citation
      remarks: highlight.remarks.replace(/【[^】]*】/g, '').trim(),
      source: citations[index].replace('.txt', '').replace('debate-', '')
    }));
  }

  // If lengths differ, extract citations from remarks
  return highlights.map(highlight => {
    // First try to extract citation from the remarks
    const remarkMatch = highlight.remarks.match(/【[^】]*debate-([A-F0-9-]+)\.txt】/);
    console.log(remarkMatch?.[1]);
    
    if (remarkMatch) {
      // If we found a citation in remarks, use it and clean the remarks
      return {
        ...highlight,
        remarks: highlight.remarks.replace(/【[^】]*】/g, '').trim(),
        // Return only the id
        source: remarkMatch[1]
      };
    }

    // If no citation in remarks but we have citations array, try to match
    if (citations?.length) {
      // Find a matching citation that hasn't been used yet
      const availableCitation = citations.find(citation => 
        !highlights.some(h => 
          h.remarks.includes(citation) || h.source?.includes(citation)
        )
      );

      if (availableCitation) {
        return {
          ...highlight,
          remarks: highlight.remarks.trim(),
          source: availableCitation
        };
      }
    }

    // If no citation found, return highlight as is
    return highlight;
  });
}

export function ThisWeek() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      // Get current day and time
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const isPM = now.getHours() >= 12.35;
      const timeOfDay = isPM ? 'pm' : 'am';
      const weekday = `${currentDay}_${timeOfDay}`;

      // Try current weekday first
      let { data: weeklySummary, error: summaryError } = await supabase
        .from('frontpage_weekly')
        .select('*')
        .eq('is_published', true)
        .eq('weekday', weekday)
        .order('week_start', { ascending: false })
        .limit(1)
        .single();

      // If no data found, try the previous time slot
      if (!weeklySummary) {
        const prevTimeOfDay = isPM ? 'am' : 'pm';
        const prevDay = isPM ? currentDay : days[(now.getDay() - 1 + 7) % 7];
        const prevWeekday = `${prevDay}_${prevTimeOfDay}`;

        ({ data: weeklySummary, error: summaryError } = await supabase
          .from('frontpage_weekly')
          .select('*')
          .eq('is_published', true)
          .eq('weekday', prevWeekday)
          .order('week_start', { ascending: false })
          .limit(1)
          .single());
      }

      if (summaryError) {
        console.error('Error fetching weekly summary:', summaryError);
      } else if (weeklySummary) {
        const processedSummary = {
          ...weeklySummary,
          highlights: matchHighlightsWithCitations(
            weeklySummary.highlights,
            weeklySummary.citations
          )
        };
        setSummary(processedSummary);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Modified component to handle image placement
  const HighlightCard = ({ highlight, index, showImage }: { 
    highlight: WeeklySummary['highlights'][0], 
    index: number,
    showImage: boolean  // New prop to control image display
  }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const debateId = highlight?.source;
    
    useEffect(() => {
      let mounted = true;
      
      const loadImage = async () => {
        // Only load image if showImage is true
        if (showImage) {
          const url = await getNextParliamentImage();
          if (mounted) {
            setImageUrl(url);
          }
        }
      };
      
      loadImage();
      
      return () => {
        mounted = false;
      };
    }, [showImage]);

    if (!highlight) {
      return <div className="w-full h-[200px] bg-muted rounded-lg animate-pulse" />;
    }

    // Randomly decide if image should be above or below
    const showImageAbove = Math.random() > 0.5;

    const ImageComponent = () => (
      showImage && imageUrl ? (
        <div className="relative h-[200px] w-full overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt="Parliament"
            fill
            className="object-cover"
          />
        </div>
      ) : null
    );

    return (
      <div className="space-y-4">
        {showImageAbove && <ImageComponent />}

        {debateId ? (
          <DebateHeader 
            key={index}
            extId={debateId}
            summaryText={highlight.remarks}
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
            <p className="text-sm text-muted-foreground mt-2">{highlight.remarks}</p>
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
              showImage={index === 0} // Only show image for first card
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
                .map(h => h.source)
                .filter(Boolean)}
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
              showImage={index === 2} // Only show image for first card in right column
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