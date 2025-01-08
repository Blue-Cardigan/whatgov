import { NextRequest, NextResponse } from 'next/server';

interface WhatsOnEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime?: string;
  category?: string;
  house?: string;
  type?: string;
  member?: {
    id: number;
    name: string;
    party: string;
    memberFrom: string;
    partyColour: string;
    photoUrl: string;
  };
  committee?: {
    id: number;
    description: string;
  };
}

interface WhatsOnResponse {
  Date: string;
  Houses: Array<{
    Name: string;
    Events: Array<{
      Id: number;
      StartDate: string;
      EndDate: string;
      StartTime: string;
      EndTime: string;
      Description: string | null;
      Type: string;
      House: string;
      Category: string;
      Location: string | null;
      SummarisedDetails: string | null;
      Committee?: {
        Id: number;
        Description: string;
        Inquiries?: {
          Id: number;
          Description: string;
        } | null;
      } | null;
      Members: Array<{
        Id: number;
        Name: string;
        Party: string;
        MemberFrom: string;
        PartyColour: string;
        PhotoUrl: string;
      }>;
    }>;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const dateStart = params.get('dateStart');
    const dateEnd = params.get('dateEnd');

    if (!dateStart) {
      throw new Error('Start date parameter is required');
    }

    const baseUrl = 'https://whatson-api.parliament.uk/calendar/events';
    const apiParams = new URLSearchParams({
      'queryParameters.startDate': dateStart,
      ...(dateEnd && { 'queryParameters.endDate': dateEnd })
    });

    const response = await fetch(`${baseUrl}/diary.json?${apiParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`WhatsOn API failed: ${response.status}`);
    }

    const rawData: WhatsOnResponse[] = await response.json();
    
    // Transform the data into our expected format
    const events: WhatsOnEvent[] = rawData.flatMap(day => 
      day.Houses.flatMap(house => 
        house.Events.map(event => {
          // Get the most relevant title and description based on event type
          let title = '';
          let description = '';

          if (event.Committee) {
            // For committee events, use committee description as title
            title = event.Committee.Description;
            
            // If there's an inquiry, use that as the description
            if (event.Committee.Inquiries?.Description) {
              description = event.Committee.Inquiries.Description;
            }
          }

          // Format summarisedDetails to extract the main content
          const formattedDetails = event.SummarisedDetails
            ? event.SummarisedDetails.split('\n\n')
                .filter(Boolean)
                .slice(1, -1)
                .join('\n\n')
                .trim()
            : undefined;

          // Use formatted details if available and no committee info
          if (!title && formattedDetails) {
            const parts = formattedDetails.split('\n');
            if (parts.length > 1) {
              title = parts.slice(1).join('\n').trim();
              description = '';
            } else {
              title = formattedDetails;
            }
          }

          // Fallback to event description if nothing else available
          if (!title && event.Description) {
            title = event.Description;
          }

          return {
            id: event.Id.toString(),
            title,
            description,
            location: event.Location || undefined,
            startTime: event.StartTime 
              ? `${event.StartDate.split('T')[0]}T${event.StartTime}:00` 
              : event.StartDate,
            endTime: event.EndTime 
              ? `${event.EndDate.split('T')[0]}T${event.EndTime}:00` 
              : undefined,
            category: event.Category,
            house: event.House,
            type: event.Type,
            members: event.Members?.map(member => ({
              id: member.Id,
              name: member.Name,
              party: member.Party,
              memberFrom: member.MemberFrom,
              partyColour: member.PartyColour,
              photoUrl: member.PhotoUrl,
              constituency: member.MemberFrom,
            })) || [],
          };
        })
      )
    );

    return NextResponse.json({ data: events });

  } catch (error) {
    console.error('WhatsOn API error:', error);
    return NextResponse.json(
      {
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
