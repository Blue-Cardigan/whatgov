export const CACHE_KEYS = {
  debates: {
    key: (date: string) => `debates:${date}`,
    ttl: 60 * 60 // 1 hour
  },
  speakers: {
    key: (id: string) => `speakers:${id}`,
    ttl: 60 * 60 * 24 * 7 // 1 week
  }
} as const;

export type CacheKey = keyof typeof CACHE_KEYS; 