import { FeedItem, PartyCount, KeyPoint } from '@/types';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { partyColours } from '@/lib/utils';
import { DivisionContent } from './DivisionContent';
import { DebateContent } from './DebateContent';
import { KeyPointsContent } from './KeyPointsContent';
import { useSwipeable } from 'react-swipeable';

interface PostCardProps {
  item: FeedItem;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
  hasReachedLimit?: boolean;
}

export function PostCard({ item, ...props }: PostCardProps) {
  // Group key points by speaker
  const pointsBySpeaker = useMemo(() => {
    const grouped: Record<string, KeyPoint[]> = {};
    (item.ai_key_points as KeyPoint[]).forEach(point => {
      if (!grouped[point.speaker]) {
        grouped[point.speaker] = [];
      }
      grouped[point.speaker].push(point);
    });
    return grouped;
  }, [item.ai_key_points]);

  const speakers = useMemo(() => Object.keys(pointsBySpeaker), [pointsBySpeaker]);

  const [activeSlide, setActiveSlide] = useState<string>(
    item.divisions && item.divisions.length > 0 ? 'division' : 'debate'
  );
  const [currentDivisionIndex, setCurrentDivisionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Updated slide change handler
  const handleSlideChange = useCallback((type: string, index?: number) => {
    if (!scrollRef.current) return;
    
    let targetIndex = 0;
    if (type === 'debate') {
      targetIndex = item.divisions ? 1 : 0;
    } else if (type.startsWith('keyPoints-')) {
      const speakerIndex = parseInt(type.split('-')[1]);
      targetIndex = (item.divisions ? 2 : 1) + speakerIndex;
    }
    
    const target = scrollRef.current.offsetWidth * targetIndex;
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
    
    setActiveSlide(type);
    if (typeof index === 'number') setCurrentDivisionIndex(index);
  }, [item.divisions]);

  // Updated swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = getSlideIndex(activeSlide);
      const maxIndex = (item.divisions ? 1 : 0) + speakers.length;
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
    if (slide === 'debate') return item.divisions ? 1 : 0;
    const speakerIndex = parseInt(slide.split('-')[1]);
    return (item.divisions ? 2 : 1) + speakerIndex;
  };

  const getSlideType = (index: number): string => {
    if (index === 0 && item.divisions) return 'division';
    if (index === (item.divisions ? 1 : 0)) return 'debate';
    const speakerIndex = index - (item.divisions ? 2 : 1);
    return `keyPoints-${speakerIndex}`;
  };

  return (
    <Card className="overflow-hidden relative w-full">
      <CardHeader className="space-y-4">
        <MetaInformation item={item} />
        <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
      </CardHeader>

      <div 
        {...swipeHandlers}
        ref={scrollRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Division Content */}
        {item.divisions && (
          <motion.div key="division" className="w-full flex-none snap-center">
            <DivisionContent 
              division={item.divisions[currentDivisionIndex]}
              isActive={activeSlide === 'division'}
            />
          </motion.div>
        )}
        
        {/* Debate Content */}
        <motion.div key="debate" className="w-full flex-none snap-center">
          <DebateContent 
            debate={item}
            {...props}
          />
        </motion.div>

        {/* Key Points Content - One per speaker */}
        {speakers.map(speaker => (
          <motion.div key={`keyPoints-${speakers.indexOf(speaker)}`} className="w-full flex-none snap-center">
            <KeyPointsContent 
              speaker={speaker}
              points={pointsBySpeaker[speaker]}
              isActive={activeSlide === `keyPoints-${speakers.indexOf(speaker)}`}
            />
          </motion.div>
        ))}
      </div>

      {/* Swipe hint for mobile */}
      <div className="absolute bottom-4 right-4 md:hidden">
        <Badge variant="secondary" className="text-xs animate-pulse">
          {activeSlide === 'division' ? 'Swipe for debate' : 
           activeSlide === 'debate' ? 'Swipe for key points' : 
           'Swipe for division'}
        </Badge>
      </div>
    </Card>
  );
}

// Extracted components for better organization
function MetaInformation({ item }: { item: FeedItem }) {
  const partyCount = item.party_count as PartyCount;
  
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
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