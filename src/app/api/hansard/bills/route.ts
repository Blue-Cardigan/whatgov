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
      sittingsData.items?.map((sitting: any) => sitting.billId).filter(Boolean) || []
    );

    // Fetch bill details for each unique billId
    const billPromises = Array.from(billIds).map(async billId => {
      try {
        const response = await fetch(`${baseUrl}/Bills/${billId}`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch bill ${billId}: ${response.status}`);
          return null;
        }

        const billData = await response.json();
        
        // Transform the bill data into our expected format
        return {
          billId: billData.billId,
          title: billData.shortTitle,
          longTitle: billData.longTitle,
          summary: billData.summary,
          currentHouse: billData.currentHouse,
          originatingHouse: billData.originatingHouse,
          isAct: billData.isAct,
          isDefeated: billData.isDefeated,
          sponsors: billData.sponsors.map((sponsor: any) => ({
            member: sponsor.member ? {
              memberId: sponsor.member.memberId,
              name: sponsor.member.name,
              party: sponsor.member.party,
              partyColour: sponsor.member.partyColour,
              house: sponsor.member.house,
              memberPhoto: sponsor.member.memberPhoto,
              memberPage: sponsor.member.memberPage,
              memberFrom: sponsor.member.memberFrom
            } : undefined,
            organisation: sponsor.organisation ? {
              name: sponsor.organisation.name,
              url: sponsor.organisation.url
            } : undefined,
            sortOrder: sponsor.sortOrder
          })),
          currentStage: billData.currentStage ? {
            description: billData.currentStage.description,
            abbreviation: billData.currentStage.abbreviation,
            house: billData.currentStage.house,
            sortOrder: billData.currentStage.sortOrder
          } : undefined
        };
      } catch (error) {
        console.error(`Error fetching bill ${billId}:`, error);
        return null;
      }
    });

    const billsData = await Promise.all(billPromises);
    const validBills = billsData.filter((bill): bill is NonNullable<typeof bill> => bill !== null);

    return NextResponse.json({
      data: {
        bills: validBills,
        sittings: sittingsData.items?.map((sitting: any) => ({
          id: sitting.id,
          stageId: sitting.stageId,
          billId: sitting.billId,
          date: sitting.date
        })) || []
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