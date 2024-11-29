import { NextRequest, NextResponse } from 'next/server';

const HANSARD_API_BASE = 'https://hansard-api.parliament.uk';

type Params = {
  params: Promise<{ extId: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  const { extId } = await params;
  
  try {
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