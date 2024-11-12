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

  return { getCache, CACHE_KEYS };
} 