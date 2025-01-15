import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface BillItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  stage: string;
  showDate?: boolean;
  'a10:updated'?: string;
  $?: {
    stage: string;
  };
  category: string | string[];
}

interface RSSResponse {
  rss: {
    channel: {
      item: BillItem[];
    };
  };
}

interface ProcessedBill {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  stage: string;
  category: string;
  showDate?: boolean;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  attributesGroupName: "$",
  removeNSPrefix: true
});

export async function GET() {
  try {
    const response = await fetch('https://bills.parliament.uk/rss/allbills.rss');
    const xml = await response.text();
    const result = parser.parse(xml) as RSSResponse;
    
    const bills = result.rss.channel.item.map((item: BillItem): ProcessedBill => {
      const categories = Array.isArray(item.category) ? item.category : [item.category];
      const displayCategory = categories[0] === 'Government Bill' ? categories[1] : categories[0];
      
      return {
        title: item.title,
        link: item.link,
        pubDate: item['a10:updated'] || item.pubDate,
        description: item.description,
        stage: item.$?.stage || '',
        category: displayCategory || 'Other'
      };
    });

    const sortedBills = bills.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

    sortedBills.forEach((bill, index) => {
      if (index > 0) {
        const prevDate = new Date(sortedBills[index - 1].pubDate).toDateString();
        const currentDate = new Date(bill.pubDate).toDateString();
        bill.showDate = prevDate !== currentDate;
      } else {
        bill.showDate = true;
      }
    });

    return NextResponse.json(sortedBills);
  } catch (error) {
    console.error('Error fetching bills RSS:', error);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
} 