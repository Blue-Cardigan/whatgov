'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import createClient from '@/lib/supabase/client';
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Share2, ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";
import { locationColors } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/types/supabase';
import { FormattedMarkdown } from '@/lib/utils';

type DebateRow = Database['public']['Tables']['debates_new']['Row'];

interface WeeklyHighlight {
  type: string;
  title: string;
  remarks: string;
  source: string;
}

interface WeeklySummary {
  week_start: string;   
  week_end: string;
  remarks: string;
  highlights: WeeklyHighlight[];
  citations: string[] | null;
}

interface WeeklySummaryProps {
  summary: WeeklySummary;
  usedDebateIds: string[];
}

interface AnalysisStatistic {
  value: string;
  context: string;
}

interface ParsedAnalysis {
  main_content?: string;
  outcome: string;
  statistics?: AnalysisStatistic[];
}

function parseAnalysisData(analysisString: string): ParsedAnalysis {
  try {
    const parsed = JSON.parse(analysisString);
    return {
      main_content: parsed.main_content,
      outcome: parsed.outcome,
      statistics: parsed.statistics?.map((stat: { value: string; context: string }) => ({
        value: stat.value,
        context: stat.context
      })).slice(0,3),
    };
  } catch (e) {
    console.error('Failed to parse analysis data:', e);
    return {
      outcome: analysisString,
      statistics: [],
    };
  }
}

function FeaturedDebate({ highlight }: { highlight: WeeklyHighlight }) {
  const [debateData, setDebateData] = useState<DebateRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const debateId = highlight.source;
  const dateStr = debateData?.date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchDebateData() {
      if (!debateId) return;
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('debates_new')
        .select('*')
        .eq('ext_id', debateId)
        .single();

      if (error) {
        console.error('Error fetching debate:', error);
      } else {
        const transformedData = {
          ...data,
          analysis: typeof data.analysis === 'string' 
            ? parseAnalysisData(data.analysis)
            : data.analysis
        };
        setDebateData(transformedData);
      }
      setIsLoading(false);
    }

    fetchDebateData();
  }, [debateId]);

  if (!debateId || isLoading) return null;

  const handleShare = async () => {
    try {
      await navigator.share({
        title: highlight.title,
        text: highlight.remarks,
        url: `/debate/${debateId}`,
      });
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/debate/${debateId}`);
      toast({
        title: "Link Copied",
        description: "The debate URL has been copied to your clipboard.",
        variant: "default",
      });
    }
  };

  const constructHansardUrl = () => {
    const formattedTitle = highlight.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    return `https://hansard.parliament.uk/House/${dateStr}/debates/${debateId}/${formattedTitle}`;
  };

  const renderAnalysisData = (analysis: ParsedAnalysis) => {
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        {/* Summary from highlight */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="text-muted-foreground leading-relaxed break-words hyphens-auto">
            <FormattedMarkdown content={highlight.remarks} />
          </div>
        </div>

        {/* Key Statistics */}
        {analysis.statistics && analysis.statistics.length > 0 && (
          <div className={cn(
            "grid gap-4 auto-rows-fr",
            {
              'grid-cols-1': analysis.statistics?.length === 1,
              'grid-cols-2': analysis.statistics?.length === 2,
              'grid-cols-1 md:grid-cols-3': analysis.statistics?.length >= 3
            }
          )}>
            {analysis.statistics.map((stat: AnalysisStatistic, index: number) => (
              <div 
                key={index} 
                className="group p-2 bg-muted/5 rounded-lg border hover:border-primary/50 transition-colors flex flex-col h-[100px] relative overflow-hidden"
              >
                <div className={cn(
                  "font-bold text-primary break-words text-center my-auto",
                  // Dynamic text sizing based on content length
                  stat.value.length <= 10 ? "text-2xl" : 
                  stat.value.length <= 20 ? "text-xl" :
                  stat.value.length <= 40 ? "text-md" :
                  "text-xs"
                )}>
                  {stat.value}
                </div>
                <div className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground break-words hyphens-auto absolute top-0 left-0 right-0 bg-muted/95 p-1 rounded-lg z-10 min-h-full transition-all duration-200">
                  <FormattedMarkdown content={stat.context} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outcome (if present) */}
        {analysis.outcome && (
          <div className="mt-4 p-4 bg-muted/5 rounded-lg border">
            <h4 className="font-medium mb-2">Outcome</h4>
            <div className="text-sm text-muted-foreground break-words hyphens-auto line-clamp-3">
              <FormattedMarkdown content={analysis.outcome} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden relative w-full border-l-[6px] transition-colors",
        "hover:shadow-md"
      )}
      style={{ 
        borderLeftColor: locationColors[highlight.type] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[highlight.type]}15, transparent 10%)`,
      }}
    >
      {/* Meta Information Header */}
      <div className="px-6 py-4 border-b bg-muted/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="hidden sm:inline h-4 w-4" />
              {format(new Date(dateStr), 'dd MMM yyyy')}
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              {debateData?.type || highlight.type}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={constructHansardUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Hansard</span>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Title and Content */}
      <CardContent className="p-6">
        <div className="space-y-6">
          <Link 
            href={`/debate/${debateId}`}
            className="hover:underline block"
          >
            <h3 className="text-xl font-bold mb-4 break-words hyphens-auto">
              {debateData?.title || highlight.title}
            </h3>
          </Link>
          
          {/* Analysis Data */}
          {debateData?.analysis && renderAnalysisData(
            typeof debateData.analysis === 'string' 
              ? parseAnalysisData(debateData.analysis)
              : debateData.analysis
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklySummary({ summary, usedDebateIds }: WeeklySummaryProps) {
  if (!summary) return null;

  const featuredHighlight = summary.highlights.find(highlight => {
    const debateId = highlight.source;
    return debateId && !usedDebateIds.includes(debateId);
  });

  return (
    <Card className="col-span-2 h-full flex flex-col max-h-full">
      <CardContent className="space-y-6 mt-4 font-serif flex-grow overflow-y-auto">
        {/* Overview */}
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm sm:text-base lg:text-md leading-relaxed">{summary.remarks}</p>
        </div>

        {/* Featured Debate */}
        {featuredHighlight && (
          <FeaturedDebate highlight={featuredHighlight} />
        )}

        {/* Add a spacer div that will expand to fill available space */}
        <div className="flex-grow" />
      </CardContent>
    </Card>
  );
}