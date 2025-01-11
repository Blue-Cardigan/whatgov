import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";

const loadingMessages = [
  "Consulting Hansard archives...",
  "Summoning Mr Speaker...",
  "Swotting up on Standing Orders...",
  "Gathering MPs from the lobby...",
  "Ringing the division bell...",
  "Polishing Big Ben...",
  "Straightening the Woolsack...",
  "Consulting Erskine May...",
  "Waiting for Order...",
];

export function LoadingAnimation({ className }: { className?: string }) {
  const [message, setMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessage(() => {
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        return loadingMessages[randomIndex];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 space-y-6", className)}>
      {/* Animated Westminster W */}
      <div className="relative w-16 h-16">
        <svg
          className="absolute inset-0 w-full h-full animate-spin-slow"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 80L35 20L50 60L65 20L80 80"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
        </svg>
        <div className="absolute inset-0 w-full h-full animate-pulse opacity-50">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 80L35 20L50 60L65 20L80 80"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary/50"
            />
          </svg>
        </div>
      </div>

      {/* Loading message */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-primary animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
} 