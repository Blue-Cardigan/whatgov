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
import { useAuth } from "@/hooks/useAuth";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";
import { useVotes } from '@/hooks/useVotes';

interface PostCardProps {
  item: FeedItem;
  userMp?: string | null;
  onVote?: (debateId: string, vote: boolean) => void;
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
  onVote,
  readOnly
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
    trackTouch: true,
    delta: 10,
    swipeDuration: 500,
  });

  // Move these functions inside PostCard and wrap with useCallback
  const getSlideIndex = useCallback((slide: string): number => {
    if (slide === 'division') return 0;
    if (slide === 'debate') return hasDivisions ? 1 : 0;
    const cardIndex = parseInt(slide.split('-')[1]);
    return (hasDivisions ? 2 : 1) + cardIndex;
  }, [hasDivisions]);

  const getSlideType = useCallback((index: number): string => {
    if (index === 0 && hasDivisions) return 'division';
    if (index === (hasDivisions ? 1 : 0)) return 'debate';
    const cardIndex = index - (hasDivisions ? 2 : 1);
    return `keyPoints-${cardIndex}`;
  }, [hasDivisions]);

  const { user, subscription } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showKeyPoints, setShowKeyPoints] = useState(false);

  // Add useVotes hook
  const { submitVote } = useVotes();

  // Unified handler for key points clicks
  const handleKeyPointsClick = () => {
    if (!user || !subscription) {
      setShowUpgradeDialog(true);
      return;
    }
    setShowComments(true);
    setShowKeyPoints(true);
  };

  // Update handleVote to use submitVote mutation
  const handleVote = useCallback(async (debateId: string, vote: boolean) => {
    try {
      // Submit vote using the mutation
      await submitVote({ 
        debate_id: debateId, 
        vote 
      });

      // Call parent onVote callback if provided
      if (onVote) {
        onVote(debateId, vote);
      }
    } catch (error) {
      console.error('Failed to submit vote:', error);
      // Error handling is done within useVotes
    }
  }, [submitVote, onVote]);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollbar, setShowScrollbar] = useState(false);

  // Add this inside PostCard component, after other useEffects
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const progress = scrollElement.scrollLeft / (scrollElement.scrollWidth - scrollElement.clientWidth);
      setScrollProgress(progress);
      
      // Show scrollbar when content is scrollable
      setShowScrollbar(scrollElement.scrollWidth > scrollElement.clientWidth);
    };

    // Initial check
    handleScroll();

    scrollElement.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // The wheel event handler useEffect will now have stable dependencies
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();
        
        if (e.deltaX > 0) {
          const currentIndex = getSlideIndex(activeSlide);
          const maxIndex = (hasDivisions ? 1 : 0) + (item.ai_comment_thread?.length || 0);
          if (currentIndex < maxIndex) {
            const nextSlide = getSlideType(currentIndex + 1);
            handleSlideChange(nextSlide);
          }
        } else if (e.deltaX < 0) {
          const currentIndex = getSlideIndex(activeSlide);
          if (currentIndex > 0) {
            const prevSlide = getSlideType(currentIndex - 1);
            handleSlideChange(prevSlide);
          }
        }
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [
    activeSlide,
    hasDivisions,
    handleSlideChange,
    getSlideIndex,
    getSlideType,
    item.ai_comment_thread?.length
  ]);

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md",
          "flex flex-col mt-8",
          userMp && userMp === item.speakers[0] ? "ring-1 ring-primary/20" : ""
        )}
        style={{ 
          borderLeftColor: locationColors[item.location] || '#2b2b2b',
          borderLeftStyle: 'solid',
          backgroundImage: `linear-gradient(to right, ${locationColors[item.location]}15, transparent 10%)`,
        }}
      >
        <div className="px-6 py-4 border-b bg-muted/5 flex-shrink-0">
          <MetaInformation item={item} />
        </div>

        <CardHeader className={cn(
          "pb-2 flex-shrink-0",
          userMp && userMp === item.speakers[0] ? "pt-8 sm:pt-10" : "pt-4"
        )}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col">
              <CardTitle className="text-xl font-bold">
                {item.ai_title}
              </CardTitle>
              {userMp && userMp === item.speakers[0] && (
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

        <div className="relative">
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
              transition: 'min-height 0.3s ease-in-out',
              touchAction: 'none'
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
                readOnly={readOnly}
                hasReachedLimit={hasReachedLimit}
                onVote={handleVote}
              />
            </motion.div>
          </div>

          {/* Custom Scrollbar */}
          {showScrollbar && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/10 mx-6"
              style={{ opacity: showScrollbar ? 1 : 0 }}
            >
              <motion.div 
                className="h-full bg-primary/50 rounded-full"
                style={{ 
                  width: '50%',
                  x: `${scrollProgress * 100}%`
                }}
                animate={{ opacity: showScrollbar ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          )}
        </div>

        {/* Comments & Key Points Section */}
        {(item.ai_comment_thread?.length > 0 || item.ai_key_points?.length > 0) && (
          <div className="border-t flex-shrink-0">
            {!showComments ? (
              <div className="px-6 py-3 flex items-center gap-4">
                <div className="flex gap-3">
                  {item.ai_comment_thread?.length > 0 && (
                    <button
                      onClick={() => {
                        setShowComments(true);
                        setShowKeyPoints(false);
                      }}
                      className="text-sm flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {item.ai_comment_thread.length} {item.ai_comment_thread.length === 1 ? 'Point' : 'Points'}
                    </button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/50 italic ml-auto">
                  Generated by GPT-4o
                </span>
              </div>
            ) : (
              <div className="px-6 py-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-4">
                  {item.ai_comment_thread?.length > 0 && (
                    <button
                      onClick={() => {
                        if (!showKeyPoints) {
                          setShowComments(false);
                        } else {
                          setShowKeyPoints(false);
                        }
                      }}
                      className={cn(
                        "text-sm flex items-center gap-1.5 transition-colors",
                        !showKeyPoints 
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Hot Takes ({item.ai_comment_thread.length})
                    </button>
                  )}
                  {item.ai_key_points?.length > 0 && (
                    <button
                      onClick={() => {
                        if (showKeyPoints) {
                          setShowComments(false);
                          setShowKeyPoints(false);
                        } else {
                          handleKeyPointsClick();
                        }
                      }}
                      className={cn(
                        "text-sm flex items-center gap-1.5 transition-colors",
                        (!user || !subscription)
                          ? "text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                          : showKeyPoints 
                            ? "text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LightbulbIcon className="h-4 w-4" />
                      Key Points
                    </button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/50 italic ml-auto">
                  Generated by GPT-4o
                </span>
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
                  subscription && item.ai_key_points && (
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

      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        title="Unlock Key Points"
        description="Get instant access to key points made by MPs with an Engaged Citizen subscription."
      />
    </>
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