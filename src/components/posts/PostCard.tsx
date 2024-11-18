import { FeedItem, PartyCount, KeyPoint } from '@/types';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users2, Building2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { partyColours } from '@/lib/utils';
import { DivisionContent } from './DivisionContent';
import { DebateContent } from './DebateContent';
import { KeyPointsContent } from './KeyPointsContent';
import { useSwipeable } from 'react-swipeable';
import { locationColors, VALID_TYPES } from '@/lib/utils';

interface PostCardProps {
  item: FeedItem;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
  hasReachedLimit?: boolean;
}

// Helper function to format the URL
function constructDebateUrl(debateExtId: string, title: string, date: string) {
  // Format the title for URL (lowercase, hyphens)
  const formattedTitle = title
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '');

  return `https://hansard.parliament.uk/House/${date}/debates/${debateExtId}/${formattedTitle}`;
}

export function PostCard({ item, ...props }: PostCardProps) {
  // Create consolidated cards of key points
  const keyPointCards = useMemo(() => {
    const POINTS_PER_CARD = 3; // Adjust based on desired density
    
    // First, sort all points by engagement
    const sortedPoints = [...(item.ai_key_points || [])].sort((a, b) => {
      const engagementA = a.support.length + a.opposition.length;
      const engagementB = b.support.length + b.opposition.length;
      return engagementB - engagementA;
    });

    // Split into cards
    return sortedPoints.reduce((acc, point, index) => {
      const cardIndex = Math.floor(index / POINTS_PER_CARD);
      if (!acc[cardIndex]) {
        acc[cardIndex] = [];
      }
      acc[cardIndex].push(point);
      return acc;
    }, [] as KeyPoint[][]);
  }, [item.ai_key_points]);

  const hasDivisions = useMemo(() => 
    item.divisions && item.divisions.length > 0
  , [item.divisions]);

  const [activeSlide, setActiveSlide] = useState<string>(
    hasDivisions ? 'division' : 'debate'
  );
  const [currentDivisionIndex, setCurrentDivisionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update height management
  const [contentHeight, setContentHeight] = useState<number>(0);
  const firstContentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Use ResizeObserver for more reliable height updates
  useEffect(() => {
    if (!firstContentRef.current) return;

    resizeObserverRef.current = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height;
      if (height && height !== contentHeight) {
        setContentHeight(height);
      }
    });

    resizeObserverRef.current.observe(firstContentRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [contentHeight,activeSlide]);

  // Updated slide change handler
  const handleSlideChange = useCallback((type: string, index?: number) => {
    if (!scrollRef.current) return;
    
    let targetIndex = 0;
    if (type === 'debate') {
      targetIndex = hasDivisions ? 1 : 0;
    } else if (type.startsWith('keyPoints-')) {
      const speakerIndex = parseInt(type.split('-')[1]);
      targetIndex = (hasDivisions ? 2 : 1) + speakerIndex;
    }
    
    const target = scrollRef.current.offsetWidth * targetIndex;
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
    
    setActiveSlide(type);
    if (typeof index === 'number') setCurrentDivisionIndex(index);
  }, [hasDivisions]);

  // Updated swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = getSlideIndex(activeSlide);
      const maxIndex = (hasDivisions ? 1 : 0) + keyPointCards.length;
      if (currentIndex < maxIndex) {
        const nextSlide = getSlideType(currentIndex + 1);
        handleSlideChange(nextSlide);
      }
    },
    onSwipedRight: () => {
      const currentIndex = getSlideIndex(activeSlide);
      if (currentIndex > 0) {
        const prevSlide = getSlideType(currentIndex - 1);
        handleSlideChange(prevSlide);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    trackTouch: true
  });

  // Helper functions
  const getSlideIndex = (slide: string): number => {
    if (slide === 'division') return 0;
    if (slide === 'debate') return hasDivisions ? 1 : 0;
    const cardIndex = parseInt(slide.split('-')[1]);
    return (hasDivisions ? 2 : 1) + cardIndex;
  };

  const getSlideType = (index: number): string => {
    if (index === 0 && hasDivisions) return 'division';
    if (index === (hasDivisions ? 1 : 0)) return 'debate';
    const cardIndex = index - (hasDivisions ? 2 : 1);
    return `keyPoints-${cardIndex}`;
  };

  return (
    <Card 
      className="overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md" 
      style={{ 
        borderLeftColor: locationColors[item.location] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[item.location]}15, transparent 10%)`,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-xl font-bold">{item.ai_title}</CardTitle>
          {item.ext_id && (
            <a
              href={constructDebateUrl(item.ext_id, item.title, item.date)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardHeader>

      <div 
        {...swipeHandlers}
        ref={scrollRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          height: contentHeight || 'auto',
          transition: 'height 0.3s ease-in-out'
        }}
      >
        {/* Division Content */}
        {hasDivisions && (
          <motion.div 
            key="division" 
            className="w-full flex-none snap-center"
            ref={activeSlide === 'division' ? firstContentRef : undefined}
          >
            <DivisionContent 
              division={item.divisions![currentDivisionIndex]}
              isActive={activeSlide === 'division'}
            />
          </motion.div>
        )}
        
        {/* Debate Content */}
        <motion.div 
          key="debate" 
          className="w-full flex-none snap-center"
          ref={!hasDivisions && activeSlide === 'debate' ? firstContentRef : undefined}
        >
          <DebateContent 
            debate={item}
            onVote={props.onVote}
            readOnly={props.readOnly}
            hasReachedLimit={props.hasReachedLimit}
          />
        </motion.div>

        {/* Key Points Content */}
        {keyPointCards.map((points, cardIndex) => (
          <motion.div 
            key={`keyPoints-${cardIndex}`} 
            className="w-full flex-none snap-center"
            ref={!hasDivisions && activeSlide === `keyPoints-${cardIndex}` ? firstContentRef : undefined}
          >
            <KeyPointsContent 
              points={points}
              isActive={activeSlide === `keyPoints-${cardIndex}`}
              cardIndex={cardIndex}
              totalCards={keyPointCards.length}
            />
          </motion.div>
        ))}
      </div>

      {/* Swipe indicator */}
      <div className="absolute bottom-16 right-4 md:hidden">
        <Badge variant="secondary" className="text-xs animate-pulse">
          {activeSlide === 'division' && hasDivisions ? 'Swipe for debate' : 
           activeSlide === 'debate' ? 'Swipe for key points' : 
           getSlideIndex(activeSlide) < keyPointCards.length + (hasDivisions ? 2 : 1) - 1 
             ? 'Swipe for more points' 
             : hasDivisions ? 'Swipe for division' : 'Swipe for debate'}
        </Badge>
      </div>

      {/* Meta information at the bottom */}
      <div className="px-6 py-4 border-t bg-muted/5">
        <MetaInformation item={item} />
      </div>
    </Card>
  );
}

// Extracted components for better organization
function MetaInformation({ item }: { item: FeedItem }) {
  const partyCount = item.party_count as PartyCount;
  const isValidType = VALID_TYPES.includes(item.type);
  
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(item.date), 'dd MMM yyyy')}
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {item.location}
          </div>
        </div>
        <PartyDistribution partyCount={partyCount} />
      </div>
      {isValidType && (
        <Badge 
          variant="secondary" 
          className="text-xs font-normal w-fit"
        >
          {item.type}
        </Badge>
      )}
    </div>
  );
}

function PartyDistribution({ partyCount }: { partyCount: PartyCount }) {
  const sortedParties = useMemo(() => {
    return Object.entries(partyCount)
      .sort(([, a], [, b]) => (b || 0) - (a || 0)) // Sort by count, descending
      .reduce((acc, [party, count]) => {
        // Group similar parties (e.g., Labour and Labour (Co-op))
        const baseParty = party.split('(')[0].trim();
        if (!acc[baseParty]) {
          acc[baseParty] = { count: 0, color: partyColours[party]?.color || '#808080' };
        }
        acc[baseParty].count += count || 0;
        return acc;
      }, {} as Record<string, { count: number; color: string }>);
  }, [partyCount]);

  const totalCount = useMemo(() => 
    Object.values(sortedParties).reduce((sum, { count }) => sum + count, 0)
  , [sortedParties]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Users2 className="h-4 w-4" />
        <span className="text-xs font-medium">{totalCount}</span>
      </div>
      <div className="flex items-center">
        {/* Party distribution bar */}
        <div className="flex h-2 w-24 rounded-full overflow-hidden">
          {Object.entries(sortedParties).map(([party, { count, color }]) => {
            const width = (count / totalCount) * 100;
            return (
              <div
                key={party}
                className="h-full first:rounded-l-full last:rounded-r-full hover:brightness-110 transition-all"
                style={{ 
                  backgroundColor: color,
                  width: `${width}%`,
                }}
                title={`${party}: ${count} ${count === 1 ? 'member' : 'members'} (${Math.round(width)}%)`}
              />
            );
          })}
        </div>
        
        {/* Show top 2 parties with counts */}
        <div className="ml-2 hidden sm:flex items-center gap-2">
          {Object.entries(sortedParties).slice(0, 2).map(([party, { count, color }]) => (
            <div
              key={party}
              className="flex items-center gap-1"
              title={`${party}: ${count} ${count === 1 ? 'member' : 'members'}`}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">
                {count}
              </span>
            </div>
          ))}
          {Object.keys(sortedParties).length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{Object.keys(sortedParties).length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}