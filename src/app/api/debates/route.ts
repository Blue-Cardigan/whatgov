import { getRedisValue, setRedisValue } from '@/app/actions/redis';
import { CACHE_KEYS } from '@/lib/redis/config';
import { HansardAPI } from '@/lib/hansard-api';
import { NextResponse } from 'next/server';

export async function GET() {
  const today = '2024-11-06';
  const cacheKey = CACHE_KEYS.debates.key(today);

  try {
    const cachedData = await getRedisValue(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const debates = await HansardAPI.getDebatesList(today);
    
    if (Array.isArray(debates) && debates.length > 0) {
      await setRedisValue(cacheKey, debates, CACHE_KEYS.debates.ttl);
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