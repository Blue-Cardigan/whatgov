import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

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
    const result = parser.parse(xml);
    
    const bills = result.rss.channel.item.map((item: any) => {
      const categories = Array.isArray(item.category) ? item.category : [item.category];
      const displayCategory = categories[0] === 'Government Bill' ? categories[1] : categories[0];
      
      return {
        title: item.title,
        link: item.link,
        pubDate: item['a10:updated'] || item.pubDate,
        description: item.description,
        stage: item.$.stage || 'Unknown stage',
        category: displayCategory || 'Other'
      };
    });

    // Sort by date and add a flag for items with the same date
    const sortedBills = bills.sort((a: any, b: any) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

    // Add a flag for items that share the same date as the previous item
    sortedBills.forEach((bill: any, index: number) => {
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