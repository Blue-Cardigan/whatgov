import type { KeyPoint } from '@/types';
import { CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { CircleDot, CircleSlash, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KeyPointsContentProps {
  points: KeyPoint[];
  isActive: boolean;
  cardIndex: number;
  totalCards: number;
}

export function KeyPointsContent({ points, isActive, cardIndex, totalCards }: KeyPointsContentProps) {
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);

  return (
    <CardContent className="p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Card progress indicator */}
        <div className="text-xs text-muted-foreground mb-4">
          Key Points {cardIndex + 1} of {totalCards}
        </div>

        {points.map((point, index) => {
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex gap-3",
                point.speaker_details?.party === "Conservative" && "justify-end"
              )}
            >
              {/* Avatar & Speaker Info */}
              {point.speaker_details?.party !== "Conservative" && (
                <div className="flex flex-col items-center gap-1">
                  <User className="h-6 w-6 p-1 rounded-full shrink-0 bg-muted" />
                  <div className="w-px flex-1 bg-muted" />
                </div>
              )}

              {/* Message Content */}
              <div className={cn(
                "group relative max-w-[80%] space-y-1",
                point.speaker_details?.party === "Conservative" && "items-end text-right"
              )}>
                {/* Always show Speaker name and party */}
                <div className={cn(
                  "text-xs text-muted-foreground",
                  point.speaker_details?.party === "Conservative" && "text-right"
                )}>
                  {point.speaker_details?.display_as || point.speaker}
                  {point.speaker_details?.party && (
                    <span className="opacity-50"> • {point.speaker_details.party}</span>
                  )}
                </div>

                {/* Message bubble */}
                <div className={cn(
                  "rounded-lg p-3 text-sm",
                  point.speaker_details?.party === "Conservative" 
                    ? "rounded-tr-none bg-blue-500/10" 
                    : "rounded-tl-none bg-muted"
                )}>
                  {point.point}
                </div>

                {/* Engagement indicators */}
                <ResponseCounts
                  support={point.support.length}
                  opposition={point.opposition.length}
                  onToggle={() => setExpandedPoint(expandedPoint === index ? null : index)}
                  align={point.speaker_details?.party === "Conservative" ? "right" : "left"}
                />

                {/* Expanded responses */}
                {expandedPoint === index && (
                  <CompactResponseDetails 
                    support={point.support}
                    opposition={point.opposition}
                  />
                )}
              </div>

              {/* Conservative Avatar */}
              {point.speaker_details?.party === "Conservative" && (
                <div className="flex flex-col items-center gap-1">
                  <User className="h-6 w-6 p-1 rounded-full shrink-0 bg-blue-500/10" />
                  <div className="w-px flex-1 bg-muted" />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </CardContent>
  );
}

// Update ResponseCounts to support alignment
function ResponseCounts({
  support,
  opposition,
  onToggle,
  align = "left"
}: {
  support: number;
  opposition: number;
  onToggle: () => void;
  align?: "left" | "right";
}) {
  if (!support && !opposition) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs",
      align === "right" && "justify-end"
    )}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 hover:bg-transparent"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {support > 0 && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CircleDot className="h-3 w-3" />
              {support}
            </span>
          )}
          {opposition > 0 && (
            <span className="flex items-center gap-1 text-rose-600">
              <CircleSlash className="h-3 w-3" />
              {opposition}
            </span>
          )}
        </div>
      </Button>
    </div>
  );
}

function CompactResponseDetails({ 
  support, 
  opposition,
  className
}: { 
  support: string[];
  opposition: string[];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn("space-y-3 pt-2", className)}
    >
      {support.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CircleDot className="h-3 w-3" /> 
            Agreed by {support.length}
          </div>
          <div className="space-y-0.5">
            {support.map((name, i) => (
              <div 
                key={i} 
                className="text-xs text-muted-foreground truncate"
                title={name}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {opposition.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-rose-600 text-xs font-medium">
            <CircleSlash className="h-3 w-3" /> 
            Opposed by {opposition.length}
          </div>
          <div className="space-y-0.5">
            {opposition.map((name, i) => (
              <div 
                key={i} 
                className="text-xs text-muted-foreground truncate"
                title={name}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}