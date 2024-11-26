import { User, ThumbsUp, ThumbsDown, UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

interface KeyPointsContentProps {
  keyPoints?: Array<{
    point: string;
    speaker: string;
    support: string[];
    opposition: string[];
  }>;
  isActive: boolean;
  userMp?: string | null;
}

export function KeyPointsContent({ keyPoints, isActive, userMp }: KeyPointsContentProps) {
  if (!keyPoints?.length) return null;

  return (
    <div className={cn(
      "space-y-4 px-6 pb-4",
      !isActive && "hidden"
    )}>
      {keyPoints.map((point, index) => {
        const isUserMp = userMp && point.speaker === userMp;
        
        return (
          <div key={index} className="flex gap-3">
            <User className={cn(
              "h-6 w-6 p-1 rounded-full shrink-0",
              isUserMp ? "bg-primary/10" : "bg-muted"
            )} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold",
                  isUserMp && "text-primary"
                )}>
                  {point.speaker}
                </span>
                {isUserMp && (
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1.5 h-5",
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <UserIcon className="h-3 w-3" />
                    <span className="text-xs">Your MP</span>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {point.point}
              </p>
              {(point.support.length > 0 || point.opposition.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {point.support.length > 0 && (
                    <Badge 
                      variant="outline" 
                      className="flex items-center gap-1.5 bg-success/10 text-success hover:bg-success/20 border-success/20"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span className="text-xs">
                        Agreed by {point.support.join(', ')}
                      </span>
                    </Badge>
                  )}
                  {point.opposition.length > 0 && (
                    <Badge 
                      variant="outline"
                      className="flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                    >
                      <ThumbsDown className="h-3 w-3" />
                      <span className="text-xs">
                        Disagreed by {point.opposition.join(', ')}
                      </span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 