import { cn } from "@/lib/utils";

interface PortraitFallbackProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function PortraitFallback({ name, size = "md", className }: PortraitFallbackProps) {
  // Get initials from name (up to 2 characters)
  const initials = name
    .replace(/The|Lord|of|Baron|Baroness|Lady|Sir/g, '')
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-full bg-muted",
        size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm",
        className
      )}
    >
      <span className="font-medium">{initials || '?'}</span>
    </div>
  );
} 