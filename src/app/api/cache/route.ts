import { NextRequest, NextResponse } from 'next/server';
import { getRedisValue, setRedisValue } from '@/app/actions/redis';

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
    const { key, value, ttl } = await request.json();
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' }, 
        { status: 400 }
      );
    }

    await setRedisValue(key, value, ttl);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: 'Failed to set cache value' }, 
      { status: 500 }
    );
  }
} 