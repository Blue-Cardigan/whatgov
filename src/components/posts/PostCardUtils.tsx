import { FeedItem } from "@/types";  
import { LightbulbIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Extract into separate component
export function PostActions({ 
  debate,
  onShare
}: { 
  debate: FeedItem; 
  onShare: () => void 
}) {
  const { isEngagedCitizen } = useAuth();
  
  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/debate/${debate.ext_id.toUpperCase()}`}
        className="group"
      >
        <CardTitle className="text-lg sm:text-xl font-bold group-hover:text-primary transition-colors flex items-center gap-1.5 sm:gap-2">
          {debate.ai_title}
          <ArrowUpRight className="min-h-[14px] min-w-[14px] h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50 -translate-y-0.5 translate-x-0.5 transition-transform group-hover:translate-y-0 group-hover:translate-x-0" />
        </CardTitle>
      </Link>
      {debate.ai_summary && isEngagedCitizen && (
        <button onClick={onShare}>
          <LightbulbIcon className="h-4 w-4 text-primary hover:text-primary/80 transition-colors" />
        </button>
      )}
    </div>
  );
}

// Extract content navigation logic into custom hook
export function useContentNavigation(hasDivisions: boolean) {
  const [activeSlide, setActiveSlide] = useState<string>(
    hasDivisions ? 'division' : 'debate'
  );
  const isFirstMount = useRef(true);
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
    setCurrentDivisionIndex,
    getSlideIndex,
    getSlideType,
    handleSlideChange,
    isFirstMount
  };
}