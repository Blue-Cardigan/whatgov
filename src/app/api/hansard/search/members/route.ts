import { NextRequest, NextResponse } from 'next/server';
import { HANSARD_API_BASE } from '@/lib/hansard-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${HANSARD_API_BASE}/search/members.json?${searchParams}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Members search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member search results' },
      { status: 500 }
    );
  }
} 