import { useState } from "react";
import Image from "next/image";
import { User2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { partyColours } from "@/lib/utils";

interface ProfileImageProps {
  src?: string | null;
  alt: string;
  size?: number;
  fallbackClassName?: string;
  party?: string;
}

export function ProfileImage({ 
  src, 
  alt, 
  size = 40,
  fallbackClassName = "",
  party,
}: ProfileImageProps) {
  const [imageError, setImageError] = useState(false);
  
  const initials = alt
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Use party colors from utils
  const partyColor = party && partyColours[party] 
    ? `bg-opacity-10 text-[${partyColours[party].color}]` 
    : 'bg-muted text-muted-foreground';

  const shouldTryImage = src && 
    typeof src === 'string' && 
    (src.startsWith('http://') || src.startsWith('https://')) &&
    !imageError;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-full flex items-center justify-center",
        !shouldTryImage && partyColor,
        fallbackClassName
      )}
      style={{ width: size, height: size }}
    >
      {shouldTryImage ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full"
          onError={() => setImageError(true)}
          priority={size > 30}
          loading={size > 30 ? 'eager' : 'lazy'}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {size > 30 ? (
            <span className="text-xs font-medium">{initials}</span>
          ) : (
            <User2 className="h-[60%] w-[60%]" />
          )}
        </div>
      )}
    </div>
  );
} 