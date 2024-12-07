import { ThumbsUp, ThumbsDown, UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import { KeyPoint } from '@/types';
import { getOneOnePortraitUrl } from '@/lib/utils';
import { PortraitFallback } from "@/components/ui/portrait-fallback";
import { createRoot } from 'react-dom/client';

interface KeyPointsContentProps {
  keyPoints?: KeyPoint[] | null;
  isActive: boolean;
  userMp?: string | null;
}

export function KeyPointsContent({ keyPoints, isActive, userMp }: KeyPointsContentProps) {
  if (!keyPoints?.length) return null;

  return (
    <div className={cn(
      "space-y-4 px-6 pb-4 pt-4",
      !isActive && "hidden"
    )}>
      {keyPoints.map((point, index) => {
        const isUserMp = userMp && point.speaker.name === userMp;
        const speaker = point.speaker;
        
        return (
          <div key={index} className="flex gap-3">
            {/* Avatar with portrait support */}
            <div className="flex-shrink-0">
              {speaker.memberId ? (
                <div className="relative h-6 w-6 rounded-full overflow-hidden">
                  <Image
                    src={getOneOnePortraitUrl(Number(speaker.memberId))}
                    alt={speaker.name}
                    sizes="(max-width: 768px) 32px, 32px"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const imgElement = e.currentTarget;
                      const parentElement = imgElement.parentElement;
                      
                      if (parentElement) {
                        // Replace with PortraitFallback
                        imgElement.style.display = 'none';
                        const fallbackElement = document.createElement('div');
                        fallbackElement.className = 'h-full w-full';
                        parentElement.appendChild(fallbackElement);
                        
                        // Render PortraitFallback
                        const root = createRoot(fallbackElement);
                        root.render(
                          <PortraitFallback 
                            name={speaker.name}
                            size="sm"
                            className={isUserMp ? "bg-primary/10" : undefined}
                          />
                        );
                      }
                    }}
                  />
                </div>
              ) : (
                <PortraitFallback 
                  name={speaker.name}
                  size="sm"
                  className={isUserMp ? "bg-primary/10" : undefined}
                />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold",
                  isUserMp && "text-primary"
                )}>
                  {speaker.name}
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