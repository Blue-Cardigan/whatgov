import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { locationColors } from '@/lib/utils';
import { useEffect, useState } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

interface DebateHeaderProps {
  extId: string;
  className?: string;
  asLink?: boolean;
  summaryText?: string;
  imageUrl?: string;
}

type DebateInfo = {
  house: string;
  date: string;
  type: string;
  title: string | null;
}

export function DebateHeader({
  extId,
  className,
  asLink = true,
  summaryText,
  imageUrl
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

  const debateType = debate.type;
  const formattedDate = format(new Date(debate.date), 'EEE, d MMM yyyy');
  
  const Content = () => (
    <div className="space-y-2">
      {imageUrl && (
        <div className="relative h-[200px] w-full overflow-hidden rounded-lg mb-4">
          <Image
            src={imageUrl}
            alt={debate?.title || ''}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div 
        className={cn(
          "w-full border-l-[6px] bg-background rounded-md",
          "flex flex-col gap-2 p-4",
          asLink && "hover:bg-muted/50 transition-colors",
          className
        )}
        style={{ 
          borderLeftColor: locationColors[debate?.house || ''] || '#2b2b2b',
          borderLeftStyle: 'solid',
          backgroundImage: `linear-gradient(to right, ${locationColors[debate?.house || '']}15, transparent 10%)`,
        }}
      >
        {/* Title */}
        <h1 className="text-lg sm:text-xl font-bold text-foreground line-clamp-2">
          {debate?.title}
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
                {debateType}
              </Badge>
            )}
          </div>
        </div>

        {/* Summary text if provided */}
        {summaryText && (
          <p className="text-sm text-muted-foreground mt-2">{summaryText}</p>
        )}
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