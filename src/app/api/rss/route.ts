import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

interface FeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  media?: unknown;
}

interface Feed {
  title?: string;
  items: FeedItem[];
}

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
    
    const feed = await parser.parseURL(url) as Feed;
    
    return NextResponse.json({
      title: feed.title,
      items: feed.items.map((item: FeedItem) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        description: item.content || item.contentSnippet,
        source: feed.title
      }))
    });
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS feed' },
      { status: 400 }
    );
  }
} 