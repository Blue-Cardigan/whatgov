import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'content']
    ]
  }
});

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    const feed = await parser.parseURL(url);
    
    return NextResponse.json({
      title: feed.title,
      items: feed.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        description: item.content || item.contentSnippet,
        source: feed.title
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch RSS feed' },
      { status: 400 }
    );
  }
} 