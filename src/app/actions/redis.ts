'use server'

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  automaticDeserialization: true,
});

export async function getRedisValue<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error('Redis server error:', error);
    return null;
  }
}

export async function setRedisValue<T>(
  key: string, 
  value: T, 
  ttl?: number
): Promise<void> {
  try {
    await redis.set(key, value, ttl ? { ex: ttl } : undefined);
  } catch (error) {
    console.error('Redis server error:', error);
  }
} 