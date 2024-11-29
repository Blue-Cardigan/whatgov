import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { operations } = await request.json();
    
    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Operations must be an array' }, 
        { status: 400 }
      );
    }

    // Execute all operations in a pipeline
    const pipeline = redis.pipeline();
    
    operations.forEach(({ key, value, ttl }) => {
      if (ttl) {
        pipeline.set(key, value, { ex: ttl });
      } else {
        pipeline.set(key, value);
      }
    });

    await pipeline.exec();

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${operations.length} operations` 
    });
  } catch (error) {
    console.error('Cache batch operation error:', error);
    return NextResponse.json(
      { error: 'Failed to process cache operations' }, 
      { status: 500 }
    );
  }
} 