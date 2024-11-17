import { useCallback, useRef } from 'react';

export function useDebounce<T>(
  value: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  timeoutRef.current = setTimeout(() => {
    return value;
  }, delay);

  return value;
} 