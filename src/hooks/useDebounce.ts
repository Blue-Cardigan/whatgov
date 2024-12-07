import { useState, useEffect } from 'react';

export function useDebounce<T>(
  value: T,
  delay: number
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// import { useRef } from 'react';

// export function useDebounce<T>(
//   value: T,
//   delay: number
// ): T {
//   const timeoutRef = useRef<NodeJS.Timeout>();

//   if (timeoutRef.current) {
//     clearTimeout(timeoutRef.current);
//   }

//   timeoutRef.current = setTimeout(() => {
//     return value;
//   }, delay);

//   return value;
// } 