import { NextRequest, NextResponse } from 'next/server';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  const data = await getRedisValue(key);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  try {
    const { key, value, ttl, action } = await request.json();
    
    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' }, 
        { status: 400 }
      );
    }

    if (action === 'delete') {
      await redis.del(key);
      return NextResponse.json({ success: true, message: 'Key deleted' });
    }

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Value is required for setting cache' }, 
        { status: 400 }
      );
    }

    await setRedisValue(key, value, ttl);
    return NextResponse.json({ success: true, message: 'Key set' });
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: 'Failed to process cache request' }, 
      { status: 500 }
    );
  }
} 