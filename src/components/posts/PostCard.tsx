import { FeedItem, PartyCount } from '@/types';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users2, ExternalLink, UserIcon, MessageSquare, LightbulbIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { partyColours } from '@/lib/utils';
import { DivisionContent } from './DivisionContent';
import { DebateContent } from './DebateContent';
import { CommentsContent } from './CommentsContent';
import { useSwipeable } from 'react-swipeable';
import { locationColors, getDebateType } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { KeyPointsContent } from './KeyPointsContent';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

interface PostCardProps {
  item: FeedItem;
  userMp?: string | null;
  onVote?: (debateId: string, questionNumber: number, vote: boolean) => void;
  readOnly?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
  hasReachedLimit?: boolean;
  remainingVotes?: number;
  isEngagedCitizen?: boolean;
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
  hasReachedLimit,
  userMp,
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
  const [showKeyPoints, setShowKeyPoints] = useState(false);

  // Check if MP spoke in the debate
  const mpSpoke = useMemo(() => 
    userMp && item.speakers?.includes(userMp)
  , [userMp, item.speakers]);

  return (
    <Card 
      className={cn(
        "overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md",
        "flex flex-col",
        mpSpoke && "ring-1 ring-primary/20"
      )}
      style={{ 
        borderLeftColor: locationColors[item.location] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[item.location]}15, transparent 10%)`,
      }}
    >
      {userMp && mpSpoke && (
        <div className="absolute left-0 top-0 p-3 z-10">
          <Badge 
            variant="secondary"
            className={cn(
              "flex items-center gap-1.5",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "shadow-sm"
            )}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs font-medium">Your MP spoke</span>
            <span className="sm:hidden text-xs font-medium">MP</span>
          </Badge>
        </div>
      )}

      <CardHeader className={cn(
        "pb-2 flex-shrink-0",
        userMp && mpSpoke ? "pt-8 sm:pt-10" : "pt-4"
      )}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col">
            <CardTitle className="text-xl font-bold">
              {item.ai_title}
            </CardTitle>
            {userMp && mpSpoke && (
              <span className="sm:hidden flex items-center gap-1.5 text-primary text-sm mt-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                Your MP spoke
              </span>
            )}
          </div>
          {item.ext_id && (
            <a
              href={constructDebateUrl(item.ext_id, item.title, item.date)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
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
            hasReachedLimit={hasReachedLimit}
          />
        </motion.div>
      </div>

      <div className="px-6 py-4 border-t bg-muted/5 flex-shrink-0">
        <MetaInformation item={item} />
      </div>

      {/* Comments & Key Points Section */}
      {(item.ai_comment_thread?.length > 0 || item.ai_key_points?.length > 0) && (
        <div className="border-t flex-shrink-0">
          {!showComments ? (
            <div className="px-6 py-3 flex items-center gap-4">
              {/* Toggle Buttons */}
              <div className="flex gap-3">
                {item.ai_comment_thread?.length > 0 && (
                  <button
                    onClick={() => {
                      setShowComments(true);
                      setShowKeyPoints(false);
                    }}
                    className={cn(
                      "text-sm flex items-center gap-1.5 transition-colors",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {item.ai_comment_thread.length} {item.ai_comment_thread.length === 1 ? 'comment' : 'comments'}
                  </button>
                )}
                {item.ai_key_points?.length > 0 && (
                  <button
                    onClick={() => {
                      setShowComments(true);
                      setShowKeyPoints(true);
                    }}
                    className={cn(
                      "text-sm flex items-center gap-1.5 transition-colors",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LightbulbIcon className="h-4 w-4" />
                    Key Points
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-3 flex items-center justify-between border-b">
              <div className="flex items-center gap-4">
                {item.ai_comment_thread?.length > 0 && (
                  <button
                    onClick={() => setShowKeyPoints(false)}
                    className={cn(
                      "text-sm flex items-center gap-1.5 transition-colors",
                      !showKeyPoints 
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Comments ({item.ai_comment_thread.length})
                  </button>
                )}
                {item.ai_key_points?.length > 0 && (
                  <button
                    onClick={() => setShowKeyPoints(true)}
                    className={cn(
                      "text-sm flex items-center gap-1.5 transition-colors",
                      showKeyPoints 
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LightbulbIcon className="h-4 w-4" />
                    Key Points
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Hide
              </button>
            </div>
          )}

          {/* Content Section */}
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {showKeyPoints ? (
                item.ai_key_points && (
                  <KeyPointsContent 
                    keyPoints={item.ai_key_points}
                    isActive={true}
                    userMp={userMp}
                  />
                )
              ) : (
                item.ai_comment_thread && (
                  <CommentsContent 
                    comments={item.ai_comment_thread}
                    isActive={true}
                  />
                )
              )}
            </motion.div>
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
    prev.hasReachedLimit === next.hasReachedLimit &&
    prev.remainingVotes === next.remainingVotes
  );
});

// Extracted components for better organisation
function MetaInformation({ item }: { item: FeedItem }) {
  const partyCount = item.party_count as PartyCount;
  const debateType = useMemo(() => getDebateType(item.type), [item.type]);
  
  const formattedDate = useMemo(() => {
    const date = new Date(item.date);
    const isCurrentYear = date.getFullYear() === new Date().getFullYear();
    return format(date, isCurrentYear ? 'dd MMM' : 'dd MMM yyyy');
  }, [item.date]);
  
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {/* Date */}
      <div className="flex items-center gap-1.5">
        <CalendarIcon className="h-4 w-4" />
        {formattedDate}
      </div>

      {/* Debate Type */}
      {debateType && (
        <Badge 
          variant="secondary"
          className="text-xs font-normal"
        >
          {debateType.label}
        </Badge>
      )}

      {/* Party Distribution */}
      <PartyDistribution partyCount={partyCount} />
    </div>
  );
}

function PartyDistribution({ partyCount }: { partyCount: PartyCount }) {
  const sortedParties = useMemo(() => {
    return Object.entries(partyCount)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .reduce((acc, [party, count]) => {
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

  // Don't render if no speakers
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Users2 className="h-4 w-4" />
        <span className="text-xs font-medium">{totalCount}</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center hover:opacity-80 transition-opacity">
            {/* Party distribution bar */}
            <div className="flex h-2 w-24 rounded-full overflow-hidden">
              {Object.entries(sortedParties).map(([party, { count, color }]) => {
                const width = (count / totalCount) * 100;
                return (
                  <div
                    key={party}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ 
                      backgroundColor: color,
                      width: `${width}%`,
                    }}
                  />
                );
              })}
            </div>

            {/* Top 2 parties preview */}
            <div className="ml-2 hidden sm:flex items-center gap-2">
              {Object.entries(sortedParties).slice(0, 2).map(([party, { count, color }]) => (
                <div
                  key={party}
                  className="flex items-center gap-1"
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
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Speakers by Party</h4>
            <div className="space-y-1.5">
              {Object.entries(sortedParties).map(([party, { count, color }]) => {
                const percentage = ((count / totalCount) * 100).toFixed(1);
                return (
                  <div 
                    key={party}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm">{party}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}