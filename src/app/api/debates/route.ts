import { getRedisValue, setRedisValue } from '@/app/actions/redis';
import { CACHE_KEYS } from '@/lib/redis/config';
import { HansardAPI } from '@/lib/hansard-api';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const debates = await HansardAPI.getDebatesList(date || undefined);
    
    if (Array.isArray(debates) && debates.length > 0) {
      // Only cache if we have a specific date
      if (date) {
        const cacheKey = CACHE_KEYS.debates.key(date);
        await setRedisValue(cacheKey, debates, CACHE_KEYS.debates.ttl);
      }
    }
    
    return NextResponse.json(debates);
  } catch (error) {
    console.error('Debates API error:', error);
    return NextResponse.json(
      { error: 'Service unavailable' }, 
      { status: 503 }
    );
  }
}