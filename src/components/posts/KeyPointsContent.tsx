import type { KeyPoint } from '@/types';
import { CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { useState } from 'react';
import { CircleDot, CircleSlash, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KeyPointsContentProps {
  speaker: string;
  points: KeyPoint[];
  isActive: boolean;
}

export function KeyPointsContent({ speaker, points, isActive }: KeyPointsContentProps) {
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);

  // Group points based on whether they're single points or not
  const { singlePoints, multiPoints } = points.reduce((acc, point) => {
    if (point.speaker_details && points.filter(p => p.speaker === point.speaker).length === 1) {
      acc.singlePoints.push(point);
    } else {
      acc.multiPoints.push(point);
    }
    return acc;
  }, { singlePoints: [] as KeyPoint[], multiPoints: [] as KeyPoint[] });

  return (
    <CardContent className="p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-2 p-4">
            <User className="h-4 w-4" />
            <h3 className="text-lg font-semibold">{speaker}</h3>
            <span className="text-muted-foreground text-sm">
              ({points.length} point{points.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>

        {/* Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {/* Combined card for single-point speakers */}
          {singlePoints.length > 0 && (
            <div className="col-span-full md:col-span-2 lg:col-span-3">
              <motion.div className="rounded-lg border bg-muted/50">
                <div className="p-4 space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Brief Contributions</h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {singlePoints.map((point, index) => (
                      <KeyPointCard
                        key={index}
                        point={point}
                        index={index}
                        isExpanded={expandedPoint === index}
                        onToggle={() => setExpandedPoint(expandedPoint === index ? null : index)}
                        variant="compact"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Regular cards for speakers with multiple points */}
          {multiPoints.map((point, index) => (
            <KeyPointCard
              key={index + singlePoints.length}
              point={point}
              index={index + singlePoints.length}
              isExpanded={expandedPoint === (index + singlePoints.length)}
              onToggle={() => setExpandedPoint(expandedPoint === (index + singlePoints.length) ? null : (index + singlePoints.length))}
              variant="default"
            />
          ))}
        </div>
      </motion.div>
    </CardContent>
  );
}

function KeyPointCard({ 
  point,
  isExpanded,
  onToggle,
  variant = 'default'
}: {
  point: KeyPoint;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  variant?: 'default' | 'compact';
}) {
  const hasResponses = point.support.length > 0 || point.opposition.length > 0;

  return (
    <motion.div 
      className={cn(
        "group rounded-lg",
        variant === 'default' && "border",
        variant === 'compact' && "border bg-background",
        "transition-all duration-200",
        isExpanded ? "bg-muted" : "hover:bg-muted/50"
      )}
      initial={false}
    >
      <div className="p-4 space-y-3">
        {/* Speaker Info */}
        {point.speaker_details && (
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 p-1.5 bg-muted-foreground/10 rounded-full" />
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium truncate">{point.speaker_details.display_as}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{point.speaker_details.party}</span>
                <span className="shrink-0">•</span>
                <span className="truncate">{point.speaker_details.constituency}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm leading-relaxed group-hover:text-primary transition-colors">
            {point.point}
          </p>
          {hasResponses && (
            <div className="flex justify-end">
              <ResponseCounts
                support={point.support.length}
                opposition={point.opposition.length}
                onToggle={onToggle}
              />
            </div>
          )}
        </div>
        
        {isExpanded && hasResponses && (
          <ResponseDetails 
            support={point.support} 
            opposition={point.opposition} 
          />
        )}
      </div>
    </motion.div>
  );
}

function ResponseCounts({
  support,
  opposition,
  onToggle
}: {
  support: number;
  opposition: number;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {support > 0 && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CircleDot className="h-3 w-3" />
            {support}
          </span>
        )}
        {opposition > 0 && (
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <CircleSlash className="h-3 w-3" />
            {opposition}
          </span>
        )}
      </div>
    </Button>
  );
}

function ResponseDetails({
  support,
  opposition
}: {
  support: string[];
  opposition: string[];
}) {
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {support.length > 0 && (
        <ResponseList
          type="support"
          responses={support}
          icon={<CircleDot className="h-3 w-3" />}
        />
      )}
      {opposition.length > 0 && (
        <ResponseList
          type="opposition"
          responses={opposition}
          icon={<CircleSlash className="h-3 w-3" />}
        />
      )}
    </div>
  );
}

function ResponseList({
  type,
  responses,
  icon
}: {
  type: 'support' | 'opposition';
  responses: string[];
  icon: React.ReactNode;
}) {
  const colorClass = type === 'support' ? 'text-emerald-600' : 'text-rose-600';
  
  return (
    <div className="text-xs">
      <span className={cn("font-medium flex items-center gap-1", colorClass)}>
        {icon} {type === 'support' ? 'Support' : 'Opposition'}
      </span>
      <div className="mt-1 pl-4 space-y-1">
        {responses.map((speaker, i) => (
          <span key={i} className="block text-muted-foreground">
            {speaker}
          </span>
        ))}
      </div>
    </div>
  );
}