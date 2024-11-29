import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { keys, warmOperations } = await request.json();
    
    if (!Array.isArray(keys)) {
      return NextResponse.json(
        { error: 'Keys must be an array' }, 
        { status: 400 }
      );
    }

    // Delete all keys in a pipeline
    const pipeline = redis.pipeline();
    keys.forEach(key => pipeline.del(key));
    await pipeline.exec();

    // If warm operations are provided, execute them
    if (Array.isArray(warmOperations)) {
      const operations = await Promise.all(
        warmOperations.map(async ({ key, fetcher }) => {
          try {
            const value = await fetcher();
            return { key, value, ttl: 300 }; // Default 5 minute TTL
          } catch (error) {
            console.error(`Failed to warm cache for key ${key}:`, error);
            return null;
          }
        })
      );

      // Filter out failed operations and set new values
      const validOperations = operations.filter(op => op !== null);
      if (validOperations.length > 0) {
        const warmPipeline = redis.pipeline();
        validOperations.forEach(op => {
          if (op) {
            warmPipeline.set(op.key, op.value, { ex: op.ttl });
          }
        });
        await warmPipeline.exec();
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully invalidated ${keys.length} keys` 
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' }, 
      { status: 500 }
    );
  }
} 