import { CACHE_KEYS } from '@/lib/redis/config';

// Define types for cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface BatchQueueEntry {
  value: unknown;
  ttl?: number;
}

// Client-side cache implementation
const clientCache = new Map<string, CacheEntry<unknown>>();
const CLIENT_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Batch operation queue
const batchQueue = new Map<string, BatchQueueEntry>();
let batchTimeout: NodeJS.Timeout | null = null;
const BATCH_DELAY = 100; // 100ms delay to batch operations

export function useCache() {
  const getFromClientCache = <T>(key: string): T | null => {
    const cached = clientCache.get(key);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data as T;
    }
    clientCache.delete(key); // Clean up expired cache
    return null;
  };

  const setToClientCache = <T>(key: string, value: T) => {
    clientCache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  };

  const getCache = async <T>(key: string): Promise<T | null> => {
    try {
      // Check client-side cache first
      const clientCached = getFromClientCache<T>(key);
      if (clientCached) return clientCached;

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
      
      // Store in client-side cache
      if (data) {
        setToClientCache(key, data);
      }

      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  };

  const executeBatch = async () => {
    if (batchQueue.size === 0) return;
    
    try {
      const operations = Array.from(batchQueue.entries()).map(([key, { value, ttl }]) => ({
        key,
        value,
        ttl
      }));

      const response = await fetch('/api/cache/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Batch cache update failed:', errorText);
      }
    } catch (error) {
      console.error('Batch cache error:', error);
    } finally {
      batchQueue.clear();
      batchTimeout = null;
    }
  };

  const setCache = async <T>(key: string, value: T, ttl?: number): Promise<boolean> => {
    try {
      // Update client-side cache immediately
      setToClientCache(key, value);

      // Add to batch queue
      batchQueue.set(key, { value, ttl });

      // Schedule batch execution
      if (!batchTimeout) {
        batchTimeout = setTimeout(executeBatch, BATCH_DELAY);
      }

      return true;
    } catch (error) {
      console.error('Cache error:', error);
      return false;
    }
  };

  const warmCache = async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> => {
    try {
      const data = await fetcher();
      await setCache(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Cache warming error:', error);
      return null;
    }
  };

  interface WarmCacheOperation<T> {
    key: string;
    fetcher: () => Promise<T>;
    ttl?: number;
  }

  const batchWarmCache = async <T>(
    operations: WarmCacheOperation<T>[]
  ): Promise<void> => {
    try {
      const results = await Promise.all(
        operations.map(async ({ key, fetcher, ttl }) => {
          const data = await fetcher();
          return { key, value: data, ttl };
        })
      );

      // Update client cache and add to batch queue
      results.forEach(({ key, value, ttl }) => {
        setToClientCache(key, value);
        batchQueue.set(key, { value, ttl });
      });

      // Execute batch
      if (batchQueue.size > 0) {
        await executeBatch();
      }
    } catch (error) {
      console.error('Batch cache warming error:', error);
    }
  };

  return { 
    getCache, 
    setCache, 
    warmCache,
    batchWarmCache,
    CACHE_KEYS 
  };
} 