import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import { KeyPoint } from '@/types';
import { getOneOnePortraitUrl } from '@/lib/utils';
import { PortraitFallback } from "@/components/ui/portrait-fallback";
import { createRoot } from 'react-dom/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface KeyPointsContentProps {
  keyPoints?: KeyPoint[] | null;
  isActive: boolean;
  userMp?: string | null;
}

export function KeyPointsContent({ keyPoints, isActive, userMp }: KeyPointsContentProps) {
  if (!keyPoints?.length) return null;

  const SpeakerPopover = ({ speaker, isUserMp }: { speaker: KeyPoint['speaker'], isUserMp: boolean }) => (
    <Popover>
      <PopoverTrigger className={cn(
        "font-bold hover:underline cursor-pointer inline-block",
        isUserMp ? "text-primary" : "text-foreground",
      )}>
        {speaker.name}
      </PopoverTrigger>
      <PopoverContent className="w-fit">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8">
            {speaker.memberId ? (
              <div className="relative h-full w-full rounded-full overflow-hidden">
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
                className={isUserMp ? "bg-primary/10" : undefined}
              />
            )}
          </div>
          <div>
            <div className="font-semibold">{speaker.name}</div>
            <div className="text-sm text-muted-foreground">
              {speaker.party} {speaker.constituency && `(${speaker.constituency})`}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const wrapSpeakerNameInText = (text: string, speaker: KeyPoint['speaker'], isUserMp: boolean) => {
    const speakerName = speaker.name;
    
    // Check if the speaker's name appears in the text
    if (text.includes(speakerName)) {
      const parts = text.split(speakerName);
      return (
        <>
          {parts[0]}
          <SpeakerPopover speaker={speaker} isUserMp={isUserMp} />
          {parts[1]}
        </>
      );
    }
    
    // If speaker name isn't in text, prepend it
    return (
      <>
        <SpeakerPopover speaker={speaker} isUserMp={isUserMp} />
        {': '}
        {text}
      </>
    );
  };

  return (
    <div className={cn(
      "space-y-4 px-6 pb-4 pt-4 max-h-[600px] overflow-y-auto",
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
              <p className="text-sm text-muted-foreground">
                {wrapSpeakerNameInText(point.point, speaker, isUserMp || false)}
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
                        Agreed by {point.support.map(speaker => speaker.name).join(', ')}
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
                        Disagreed by {point.opposition.map(speaker => speaker.name).join(', ')}
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