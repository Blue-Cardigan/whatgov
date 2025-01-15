import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "_",
  textNodeName: "_text",
});

interface EventEntry {
  title: {
    _text: string;
  };
  content: {
    _text: string;
  };
  id: string;
  updated: string;
}

interface EventFeedResponse {
  feed: {
    entry: EventEntry[];
  };
}

export async function GET() {
  try {
    const response = await fetch('http://data.parliamentlive.tv/api/event/feed');
    const xml = await response.text();
    const result = parser.parse(xml) as EventFeedResponse;
    
    const events = result.feed.entry.map((entry: EventEntry) => {
      const linkMatch = entry.content._text.match(/href='([^']+)'/);
      
      return {
        title: entry.title._text,
        link: linkMatch ? linkMatch[1] : `https://parliamentlive.tv/event/index/${entry.id}`,
        startDate: entry.updated,
        location: entry.title._text.includes('[') 
          ? entry.title._text.match(/\[(.*?)\]/)?.[1] 
          : 'Parliament',
        id: entry.id,
        status: entry.content._text.includes('Meeting Started') ? 'Live' : 'Upcoming'
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events RSS:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
} 