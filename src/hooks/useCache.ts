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
        console.error('Cache fetch failed:', await response.text());
        return null;
      }
      
      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  };

  const setCache = async <T>(key: string, value: T, ttl?: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add CSRF token if you have one
          // 'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ key, value, ttl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cache update failed:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Cache error:', error);
      return false;
    }
  };

  return { 
    getCache, 
    setCache, 
    CACHE_KEYS 
  };
} 