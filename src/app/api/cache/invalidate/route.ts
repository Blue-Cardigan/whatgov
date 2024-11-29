import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { keys } = await request.json();
    
    if (!Array.isArray(keys)) {
      return NextResponse.json(
        { error: 'Keys must be an array' }, 
        { status: 400 }
      );
    }

    // Delete all keys in parallel
    await Promise.all(keys.map(key => redis.del(key)));

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