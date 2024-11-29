import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis'

const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';
const CACHE_TTL = 60 * 60 * 24; // 24 hours

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type Params = {
  params: Promise<{ extId: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  const { extId } = await params;
  const cacheKey = `hansard:${extId}`;
  
  try {
    // Try to get from cache first
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
    } catch (cacheError) {
      console.warn('Redis cache error:', cacheError);
      // Continue execution if cache fails
    }

    const hansardUrl = `${HANSARD_API_BASE}/debates/debate/${extId}.json`;
    
    const response = await fetch(hansardUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch Hansard data',
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Try to cache the response
    try {
      await redis.set(cacheKey, data, { ex: CACHE_TTL });
    } catch (cacheError) {
      console.warn('Redis cache storage error:', cacheError);
      // Continue execution if cache fails
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Hansard API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 