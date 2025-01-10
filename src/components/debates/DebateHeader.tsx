import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { locationColors, getDebateType } from '@/lib/utils';
import { useEffect, useState } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';
import { PartyDistribution } from '../posts/PartyDistribution';
import { PartyCount } from '@/types';

interface DebateHeaderProps {
  extId: string;
  className?: string;
  asLink?: boolean;
}

type DebateInfo = {
  party_count: PartyCount;
  contribution_count: number;
  house: string;
  date: string;
  type: string;
  ai_title: string | null;
}

export function DebateHeader({
  extId,
  className,
  asLink = true
}: DebateHeaderProps) {
  const [debate, setDebate] = useState<DebateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDebate() {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('debates_new')
        .select('title, type, house, date, analysis, speaker_points')
        .eq('ext_id', extId)
        .single();

      if (error) {
        console.error('Error fetching debate:', error);
        setIsLoading(false);
        return;
      }

      setDebate(data);
      setIsLoading(false);
    }

    if (extId) {
      fetchDebate();
    }
  }, [extId]);

  if (isLoading) {
    return (
      <div className="w-full h-16 animate-pulse bg-muted rounded-md" />
    );
  }

  if (!debate) {
    return null;
  }

  const debateType = getDebateType(debate.type);
  const formattedDate = format(new Date(debate.date), 'EEE, d MMM yyyy');
  
  const Content = () => (
    <div 
      className={cn(
        "w-full border-l-[6px] bg-background rounded-md",
        "flex flex-col gap-2 p-4",
        asLink && "hover:bg-muted/50 transition-colors",
        className
      )}
      style={{ 
        borderLeftColor: locationColors[debate.house] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[debate.house]}15, transparent 10%)`,
      }}
    >
      {/* Title */}
      <h1 className="text-lg sm:text-xl font-bold text-foreground line-clamp-2">
        {debate.ai_title}
      </h1>

      {/* Meta information */}
      <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4">
          {/* Date */}
          <span>{formattedDate}</span>

          {/* Debate Type */}
          {debateType && (
            <Badge 
              variant="secondary"
              className="text-xs font-normal w-fit"
            >
              {debateType.label}
            </Badge>
          )}
        </div>

        {/* Replace Stats with PartyDistribution */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            {debate.contribution_count}
          </span>
        </div>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link href={`/debate/${extId}`}>
        <Content />
      </Link>
    );
  }

  return <Content />;
} 