import { CACHE_KEYS } from '@/lib/redis/config';

export function useCache() {
  const getCache = async <T>(key: string): Promise<T | null> => {
    try {
      const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`);
      if (!response.ok) return null;
      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  };

  const setCache = async <T>(key: string, value: T, ttl?: number): Promise<void> => {
    try {
      await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl }),
      });
    } catch (error) {
      console.error('Cache error:', error);
    }
  };

  return { getCache, setCache, CACHE_KEYS };
} 