import { NextRequest, NextResponse } from 'next/server';
import { HANSARD_API_BASE } from '@/lib/hansard-api';

export async function GET(request: NextRequest) {
  try {
    // Get the search parameters from the request URL
    const searchParams = request.nextUrl.searchParams;
    
    // Construct the Hansard API URL
    const url = `${HANSARD_API_BASE}/search.json?${searchParams.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}