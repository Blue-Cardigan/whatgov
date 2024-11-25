import { FeedItem, PartyCount, CommentThread } from '@/types';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users2, Building2, ExternalLink, User, UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { partyColours } from '@/lib/utils';
import { DivisionContent } from './DivisionContent';
import { DebateContent } from './DebateContent';
import { CommentsContent } from './CommentsContent';
import { useSwipeable } from 'react-swipeable';
import { locationColors, getDebateType, TOPICS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface PostCardProps {
  item: FeedItem;
  userMp?: string | null;
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

export const PostCard = memo(function PostCard({ 
  item, 
  onExpandChange,
  ...props 
}: PostCardProps) {
  const hasDivisions = useMemo(() => 
    item.divisions && item.divisions.length > 0
  , [item.divisions]);

  const [activeSlide, setActiveSlide] = useState<string>(
    hasDivisions ? 'division' : 'debate'
  );
  const [currentDivisionIndex, setCurrentDivisionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track heights of all content sections
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({
    division: null,
    debate: null
  });

  // Use ResizeObserver to track heights of all sections
  useEffect(() => {
    const observers: ResizeObserver[] = [];
    
    Object.entries(contentRefs.current).forEach(([key, element]) => {
      if (!element) return;

      const observer = new ResizeObserver(entries => {
        const height = entries[0]?.contentRect.height;
        if (height) {
          setContentHeights(prev => ({
            ...prev,
            [key]: height
          }));
        }
      });

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  // Calculate maximum height from all sections
  const maxContentHeight = useMemo(() => {
    const heights = Object.values(contentHeights);
    return heights.length > 0 ? Math.max(...heights) : 0;
  }, [contentHeights]);

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
      const maxIndex = (hasDivisions ? 1 : 0) + (item.ai_comment_thread?.length || 0);
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

  const [showComments, setShowComments] = useState(false);

  // Check if MP spoke in the debate
  const mpSpoke = useMemo(() => 
    props.userMp && item.speakers?.includes(props.userMp)
  , [props.userMp, item.speakers]);

  return (
    <Card 
      className={cn(
        "overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md",
        "flex flex-col"
      )}
      style={{ 
        borderLeftColor: locationColors[item.location] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[item.location]}15, transparent 10%)`,
      }}
    >
      <CardHeader className="pb-2 flex-shrink-0">
        {/* Only show MP indicator if we have both an MP and they spoke */}
        {props.userMp && mpSpoke && (
          <div className="flex items-center gap-2 text-primary mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <UserIcon className="h-3.5 w-3.5" />
              Your MP spoke in this debate
            </div>
          </div>
        )}
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
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-none",
          "scroll-smooth flex-grow"
        )}
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          minHeight: maxContentHeight || 'auto',
          transition: 'min-height 0.3s ease-in-out'
        }}
      >
        {/* Division Content */}
        {hasDivisions && (
          <motion.div 
            key="division" 
            className="w-full flex-shrink-0 snap-center h-full"
            ref={el => {
              contentRefs.current.division = el;
            }}
            layout
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
          className="w-full flex-shrink-0 snap-center h-full"
          ref={el => {
            contentRefs.current.debate = el;
          }}
          layout
        >
          <DebateContent 
            debate={item}
            onVote={props.onVote}
            readOnly={props.readOnly}
            hasReachedLimit={props.hasReachedLimit}
          />
        </motion.div>
      </div>

      <div className="px-6 py-4 border-t bg-muted/5 flex-shrink-0">
        <MetaInformation item={item} />
      </div>

      {/* Key Points Preview */}
      {item.ai_comment_thread && item.ai_comment_thread.length > 0 && (
        <div className="border-t flex-shrink-0">
          <div className="px-6 py-3">
            {!showComments ? (
              <button
                onClick={() => setShowComments(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {item.ai_comment_thread.length} comments
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Comments</h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hide comments
                </button>
              </div>
            )}
          </div>

          {/* Preview two most relevant comments when collapsed */}
          {!showComments && (
            <div className="px-6 pb-3">
              {item.ai_comment_thread.slice(0, 2).map((comment) => (
                <PreviewComment key={comment.id} comment={comment} />
              ))}
            </div>
          )}

          {/* Full comments section when expanded */}
          {showComments && (
            <CommentsContent 
              comments={item.ai_comment_thread}
              isActive={true}
            />
          )}
        </div>
      )}
    </Card>
  );
}, (prev, next) => {
  // Custom comparison to determine if re-render is needed
  return (
    prev.item.id === next.item.id &&
    prev.readOnly === next.readOnly &&
    prev.hasReachedLimit === next.hasReachedLimit
  );
});

// Extracted components for better organisation
function MetaInformation({ item }: { item: FeedItem }) {
  const partyCount = item.party_count as PartyCount;
  
  // Get debate type details
  const debateType = useMemo(() => {
    return getDebateType(item.type);
  }, [item.type]);
  
  // Get topics from ai_topics array and match with TOPICS array
  const topics = Object.entries(item.ai_topics || {})
    .map(([, topicData]) => ({
      topic: TOPICS.find(t => t.label === topicData.name),
      frequency: topicData.frequency
    }))
    .filter(({ topic }) => topic)
    .sort((a, b) => b.frequency - a.frequency);
  
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
      <div className="flex items-center gap-2 flex-wrap">
        {debateType && (
          <Badge 
            variant="secondary"
            className="text-xs font-normal w-fit"
          >
            {debateType.label}
          </Badge>
        )}
        {topics.map(({ topic, frequency }) => topic && (
          <Badge 
            key={topic.id}
            variant="outline" 
            className="text-xs font-normal w-fit flex items-center gap-1"
            title={`Mentioned ${frequency} times`}
          >
            <topic.icon className="h-3 w-3" />
            {topic.label}
          </Badge>
        ))}
      </div>
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

// New component for preview comments
function PreviewComment({ comment }: { comment: CommentThread }) {
  return (
    <div className="flex gap-2 py-1">
      <User className={cn(
        "h-6 w-6 p-1 rounded-full shrink-0",
        comment.party === "Conservative" 
          ? "bg-blue-500/10" 
          : "bg-muted"
      )} />
      <div className="text-sm">
        <span className="font-semibold">
          {comment.author}
        </span>
        {' '}
        <span className="text-muted-foreground line-clamp-1">
          {comment.content}
        </span>
      </div>
    </div>
  );
}