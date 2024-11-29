import { FeedItem, PartyCount } from '@/types';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, MessageSquare, LightbulbIcon, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DivisionContent } from './DivisionContent';
import { DebateContent } from './DebateContent';
import { CommentsContent } from './CommentsContent';
import { useSwipeable } from 'react-swipeable';
import { locationColors, getDebateType } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { KeyPointsContent } from './KeyPointsContent';
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";
import { useVotes } from '@/hooks/useVotes';
import { PartyDistribution } from './PartyDistribution';
import Link from 'next/link';

interface PostCardProps {
  item: FeedItem;
  userMp?: string | null;
  onVote?: (debateId: string, vote: boolean) => void;
  readOnly?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
  hasReachedLimit?: boolean;
  remainingVotes?: number;
}

// Extract into separate component
function PostActions({ 
  debate
}: { 
  debate: FeedItem; 
  onShare: () => void 
}) {
  return (
    <Link 
      href={`/debate/${debate.ext_id.toUpperCase()}`}
      className="group"
    >
      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors flex items-center gap-1">
        {debate.ai_title}
        <ArrowUpRight className="h-4 w-4 opacity-50 -translate-y-1 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0" />
      </CardTitle>
    </Link>
  );
}

// Extract content navigation logic into custom hook
function useContentNavigation(hasDivisions: boolean) {
  const [activeSlide, setActiveSlide] = useState<string>(
    hasDivisions ? 'division' : 'debate'
  );
  const [currentDivisionIndex, setCurrentDivisionIndex] = useState(0);

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

  const handleSlideChange = useCallback((type: string, index?: number) => {
    setActiveSlide(type);
    if (typeof index === 'number') setCurrentDivisionIndex(index);
  }, []);

  return {
    activeSlide,
    currentDivisionIndex,
    getSlideIndex,
    getSlideType,
    handleSlideChange
  };
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

  const { 
    activeSlide, 
    currentDivisionIndex, 
    getSlideIndex, 
    getSlideType, 
    handleSlideChange 
  } = useContentNavigation(hasDivisions || false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { user, isEngagedCitizen } = useAuth();
  const { submitVote } = useVotes();

  // Memoize computed values
  const isUserMpSpeaker = useMemo(() => 
    userMp && item.speakers?.[0]?.display_as === userMp,
    [userMp, item.speakers]
  );

  const showKeyPointsButton = useMemo(() => 
    item.ai_key_points?.length > 0 && (user && isEngagedCitizen),
    [item.ai_key_points, user, isEngagedCitizen]
  );

  // Extract swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = getSlideIndex(activeSlide);
      const maxIndex = (hasDivisions ? 1 : 0) + (item.ai_comment_thread?.length || 0);
      if (currentIndex < maxIndex) {
        handleSlideChange(getSlideType(currentIndex + 1));
      }
    },
    onSwipedRight: () => {
      const currentIndex = getSlideIndex(activeSlide);
      if (currentIndex > 0) {
        handleSlideChange(getSlideType(currentIndex - 1));
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    trackTouch: true,
    delta: 10,
    swipeDuration: 500,
  });

  // Handle vote submission
  const handleVote = useCallback(async (debateId: string, vote: boolean) => {
    try {
      await submitVote({ debate_id: debateId, vote });
      onVote?.(debateId, vote);
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  }, [submitVote, onVote]);

  // Handle key points interaction
  const handleKeyPointsClick = useCallback(() => {
    if (!user || !isEngagedCitizen) {
      setShowUpgradeDialog(true);
      return;
    }
    setShowComments(true);
    setShowKeyPoints(true);
  }, [user, isEngagedCitizen]);

  // Add refs for content sections
  const contentRefs = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({
    division: null,
    debate: null
  });

  // Add scroll state
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Handle scroll events
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      const hasScroll = scrollWidth > clientWidth;
      setShowScrollbar(hasScroll);
      
      if (hasScroll) {
        const progress = scrollLeft / (scrollWidth - clientWidth);
        setScrollProgress(progress);
      }
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

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden relative w-full border-l-[6px] transition-colors shadow-sm hover:shadow-md",
          "flex flex-col mt-8",
          isUserMpSpeaker ? "ring-1 ring-primary/20" : ""
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
          userMp && item.speakers?.[0]?.display_as === userMp ? "pt-8 sm:pt-10" : "pt-4"
        )}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col">
              <PostActions 
                debate={item} 
                onShare={handleKeyPointsClick}
              />
              {userMp && item.speakers?.[0]?.display_as === userMp && (
                <span className="sm:hidden flex items-center gap-1.5 text-primary text-sm mt-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  Your MP spoke
                </span>
              )}
            </div>
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
              minHeight: 'auto',
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
        {(item.ai_comment_thread?.length > 0 || showKeyPointsButton) && (
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
                  {showKeyPointsButton && (
                    <button
                      onClick={handleKeyPointsClick}
                      className="text-sm flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <LightbulbIcon className="h-4 w-4" />
                      Key Points
                    </button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/50 italic ml-auto">
                  Generated by GPT-4
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
                  {showKeyPointsButton && (
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
                        (!user || !isEngagedCitizen)
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
                  Generated by GPT-4
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
                  isEngagedCitizen && item.ai_key_points && (
                    <KeyPointsContent 
                      keyPoints={item.ai_key_points}
                      isActive={true}
                      userMp={userMp}
                      speakers={item.speakers}
                    />
                  )
                ) : (
                  item.ai_comment_thread && (
                    <CommentsContent 
                      comments={item.ai_comment_thread}
                      isActive={true}
                      speakers={item.speakers}
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
  // Improved memo comparison
  return (
    prev.item.id === next.item.id &&
    prev.readOnly === next.readOnly &&
    prev.hasReachedLimit === next.hasReachedLimit &&
    prev.remainingVotes === next.remainingVotes &&
    prev.userMp === next.userMp
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