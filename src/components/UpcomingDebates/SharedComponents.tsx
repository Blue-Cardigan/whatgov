import { useState } from "react";
import Image from "next/image";
import { User2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileImage({ 
  src, 
  alt, 
  size = 40,
  fallbackClassName = "",
  party,
}: { 
  src?: string | null; 
  alt: string; 
  size?: number;
  fallbackClassName?: string;
  party?: string;
}) {
  const [imageError, setImageError] = useState(false);
  
  // Get initials from name
  const initials = alt
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Map party to background color
  const partyColors: Record<string, string> = {
    'Conservative': 'bg-blue-100 text-blue-700',
    'Labour': 'bg-red-100 text-red-700',
    'Scottish National Party': 'bg-yellow-100 text-yellow-700',
    'Liberal Democrat': 'bg-orange-100 text-orange-700',
    'Green Party': 'bg-green-100 text-green-700',
    'Independent': 'bg-gray-100 text-gray-700',
    'default': 'bg-muted text-muted-foreground'
  };

  const partyColor = party ? (partyColors[party] || partyColors.default) : partyColors.default;

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