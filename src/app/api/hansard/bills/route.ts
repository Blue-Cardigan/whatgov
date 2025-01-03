import { NextRequest, NextResponse } from 'next/server';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface ApiError {
  ok: false;
  status: number;
  error: any;
}

const MAX_ITEMS_PER_REQUEST = 100;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const dateStart = params.get('dateStart');
    const dateEnd = params.get('dateEnd');
    const skip = parseInt(params.get('skip') || '0');

    if (!dateStart || !dateEnd) {
      throw new Error('Date parameters are required');
    }

    const baseUrl = process.env.HANSARD_BILLS_URL;
    if (!baseUrl) {
      throw new Error('API URL not configured');
    }

    const sittingsParams = new URLSearchParams({
      'DateFrom': dateStart,
      'DateTo': dateEnd,
      'Take': MAX_ITEMS_PER_REQUEST.toString(),
      'Skip': skip.toString()
    });

    const sittingsResponse = await fetch(`${baseUrl}/Sittings?${sittingsParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!sittingsResponse.ok) {
      throw new Error(`Sittings API failed: ${sittingsResponse.status}`);
    }

    const sittingsData = await sittingsResponse.json();
    
    // Extract billIds from the items array
    const billIds = new Set(
      sittingsData.items?.map((sitting: any) => sitting.billId) || []
    );

    console.log('Found bill IDs:', billIds);

    // Fetch bill details for each unique billId
    const billPromises = Array.from(billIds).map(billId =>
      fetch(`${baseUrl}/api/v1/Bills/${billId}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
    );

    const billsData = await Promise.all(billPromises);
    const validBills = billsData.filter(bill => bill !== null);

    return NextResponse.json({
      data: {
        bills: validBills,
        sittings: sittingsData.items || []  // Return the items array
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        data: {
          bills: [],
          sittings: []
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}