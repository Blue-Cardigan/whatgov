import { CACHE_KEYS } from '@/lib/redis/config';

export function useCache() {
  const getCache = async <T>(key: string): Promise<T | null> => {
    try {
      const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Cache fetch failed: ${response.statusText}`);
      }
      
      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  };

  const setCache = async <T>(key: string, value: T, ttl?: number): Promise<void> => {
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl }),
      });

      if (!response.ok) {
        throw new Error(`Cache update failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Cache error:', error);
    }
  };

  return { getCache, setCache, CACHE_KEYS };
} 