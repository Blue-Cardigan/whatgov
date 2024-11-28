import { User, ThumbsUp, ThumbsDown, UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';

interface KeyPointsContentProps {
  keyPoints?: Array<{
    point: string;
    speaker: string;
    support: string[];
    opposition: string[];
  }>;
  isActive: boolean;
  userMp?: string | null;
  speakers?: Array<{ display_as: string; member_id?: number }>;
}

// Helper function to get portrait URL
const getPortraitUrl = (memberId: number) => 
  `https://members-api.parliament.uk/api/Members/${memberId}/Portrait?croptype=oneone&webversion=true`;

// Helper function to find matching speaker
const findMatchingSpeaker = (
  speakerName: string, 
  speakers?: Array<{ display_as: string; member_id?: number }>
) => {
  return speakers?.find(speaker => 
    speaker.display_as.toLowerCase() === speakerName.toLowerCase()
  );
};

export function KeyPointsContent({ keyPoints, isActive, userMp, speakers }: KeyPointsContentProps) {
  if (!keyPoints?.length) return null;

  return (
    <div className={cn(
      "space-y-4 px-6 pb-4 pt-4",
      !isActive && "hidden"
    )}>
      {keyPoints.map((point, index) => {
        const isUserMp = userMp && point.speaker === userMp;
        const matchingSpeaker = findMatchingSpeaker(point.speaker, speakers);
        
        return (
          <div key={index} className="flex gap-3">
            {/* Avatar with portrait support */}
            <div className="flex-shrink-0">
              {matchingSpeaker?.member_id ? (
                <div className="relative h-6 w-6 rounded-full overflow-hidden">
                  <Image
                    src={getPortraitUrl(matchingSpeaker.member_id)}
                    alt={point.speaker}
                    sizes="(max-width: 768px) 32px, 32px"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to User icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="h-full w-full flex items-center justify-center ${
                          isUserMp ? "bg-primary/10" : "bg-muted"
                        }">
                          <svg class="h-4 w-4" viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <User className={cn(
                  "h-6 w-6 p-1 rounded-full shrink-0",
                  isUserMp ? "bg-primary/10" : "bg-muted"
                )} />
              )}
            </div>

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