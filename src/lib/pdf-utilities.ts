import pdfMake from 'pdfmake/build/pdfmake';
import { format } from 'date-fns';
import type { Content, TDocumentDefinitions, ContentText } from 'pdfmake/interfaces';
import type { SavedSearch } from '@/types/search';
import type { TimeSlot } from '@/types/calendar';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

if (pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else {
  pdfMake.vfs = pdfFonts;
}

interface AnalysisData {
  main_content: string;
  outcome: string;
  key_statistics?: Array<{ value: string; context: string }>;
  key_dates?: Array<{ date: string; significance: string }>;
}

interface SpeakerContribution {
  content: string;
  references?: Array<{ text: string }>;
}

interface SpeakerPoint {
  name: string;
  role: string;
  constituency?: string;
  party: string;
  contributions?: SpeakerContribution[];
}

export const COLORS = {
    primary: '#449441',
    primaryForeground: '#fafafa',
    secondary: '#f0fdf4',
    muted: '#71717a',
    border: '#e4e4e7',
    background: '#ffffff',
    warning: '#f59e0b',
} as const;

export const SYMBOLS = {
    calendar: '•',
    location: '›',
    type: '»',
    analysis: '—',
    person: '·',
    reference: '†',
  };  

export const PAGE_WIDTH = 595.28;

const formatAnalysisData = (analysis: string) => {
  try {
    const data: AnalysisData = JSON.parse(analysis);
    return `
## Main Content
${data.main_content}

## Outcome
${data.outcome}

## Key Statistics
${data.key_statistics?.map((stat) => `- ${stat.value}: ${stat.context}`).join('\n')}

## Key Dates
${data.key_dates?.map((date) => `- ${date.date}: ${date.significance}`).join('\n')}
`.trim();
  } catch (e) {
    console.warn('Failed to parse analysis JSON:', e);
    return analysis;
  }
};

const formatSpeakerPoints = (speakerPoints: string | SpeakerPoint[]) => {
  try {
    const points: SpeakerPoint[] = Array.isArray(speakerPoints)
      ? speakerPoints
      : JSON.parse(speakerPoints || '[]');
    
    return points.map((speaker: SpeakerPoint) => `
## ${speaker.name}
${speaker.role}${speaker.constituency ? ` - ${speaker.constituency}` : ''}
Party: ${speaker.party}

Key Contributions:
${speaker.contributions?.map((contribution) => `
- ${contribution.content}
  ${contribution.references?.map((ref) => `  • ${ref.text}`).join('\n') || ''}
`).join('\n')}
`.trim()).join('\n\n');
  } catch (e) {
    console.warn('Failed to parse speaker points:', e);
    return '';
  }
};

interface CalendarItem {
  event_data: TimeSlot;
  date: string;
}

export async function exportSearchToPDF(search: SavedSearch) {
  const docDefinition: TDocumentDefinitions = {
    content: [
      {
        text: search.query,
        style: 'header'
      },
      {
        text: `Created ${format(new Date(search.created_at), 'PPP')}`,
        style: 'metadata'
      },
      {
        text: search.response,
        style: 'content'
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      metadata: {
        fontSize: 12,
        color: COLORS.muted,
        margin: [0, 0, 0, 20]
      },
      content: {
        fontSize: 12,
        margin: [0, 0, 0, 10]
      }
    }
  };

  const filename = `search_${format(new Date(search.created_at), 'yyyy-MM-dd')}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportCalendarItemToPDF(
  item: { event_data: TimeSlot; date: string },
  debateData?: {
    analysis: string;
    speaker_points: string | SpeakerPoint[];
  }
) {
  let title = 'Calendar Event';
  let content: Content[] = [];

  if (item.event_data.type === 'edm' && item.event_data.edm) {
    const { edm } = item.event_data;
    title = `EDM ${edm.id}: ${edm.title}`;
    content = [
      { text: `Primary Sponsor: ${edm.primarySponsor?.name || 'N/A'}`, margin: [0, 0, 0, 10] },
      { text: `Date Tabled: ${format(new Date(edm.dateTabled), 'PPP')}`, margin: [0, 0, 0, 10] },
      { text: edm.text, margin: [0, 0, 0, 20] }
    ];
  } else if (item.event_data.type === 'oral-questions') {
    title = `Oral Questions: ${item.event_data.department}`;
    content = [
      { text: `Date: ${format(new Date(item.date), 'PPP')}`, margin: [0, 0, 0, 10] },
      { text: `Department: ${item.event_data.department}`, margin: [0, 0, 0, 10] },
      { text: `Minister: ${item.event_data.ministerTitle || 'N/A'}`, margin: [0, 0, 0, 20] }
    ];

    if (debateData) {
      content.push(
        { text: 'Debate Analysis', style: 'subheader' },
        { text: formatAnalysisData(debateData.analysis), margin: [0, 0, 0, 20] },
        { text: 'Speaker Contributions', style: 'subheader' },
        { text: formatSpeakerPoints(debateData.speaker_points), margin: [0, 0, 0, 20] }
      );
    }
  } else if (item.event_data.type === 'event' && item.event_data.event) {
    const { event } = item.event_data;
    title = event.title;
    content = [
      { text: `Type: ${event.type}`, margin: [0, 0, 0, 10] },
      { text: `Category: ${event.category || 'N/A'}`, margin: [0, 0, 0, 10] },
      { text: `Date: ${event.startTime ? format(new Date(event.startTime), 'PPP p') : 'N/A'}`, margin: [0, 0, 0, 10] },
      event.description ? { text: event.description, margin: [0, 0, 0, 20] } : { text: '', margin: [0, 0, 0, 20] }
    ];  
  }

  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: title, style: 'header' },
      ...content
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 20]
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 20, 0, 10]
      }
    }
  };

  const filename = `event_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}

export async function exportAllToPDF(searches: SavedSearch[], calendarItems: CalendarItem[]) {
  const allContent: Content[] = [];

  // Add searches
  if (searches.length > 0) {
    allContent.push(
      { text: 'Saved Searches', style: 'sectionHeader' } as ContentText,
      ...searches.flatMap(search => [
        { text: search.query, style: 'itemHeader' } as ContentText,
        { text: `Created ${format(new Date(search.created_at), 'PPP')}`, style: 'metadata' } as ContentText,
        { text: search.response, style: 'content' } as ContentText,
        { text: '', style: 'spacer', margin: [0, 0, 0, 20] } as ContentText
      ])
    );
  }

  // Add calendar items
  if (calendarItems.length > 0) {
    allContent.push(
      { text: 'Calendar Items', style: 'sectionHeader', pageBreak: 'before' } as ContentText,
      ...calendarItems.flatMap(item => {
        const content: Content[] = [
          { text: item.event_data.type, style: 'itemHeader' } as ContentText
        ];

        if (item.event_data.type === 'edm' && item.event_data.edm) {
          content.push(
            { text: `EDM ${item.event_data.edm.id}: ${item.event_data.edm.title}`, style: 'subheader' } as ContentText,
            { text: item.event_data.edm.text, style: 'content' } as ContentText
          );
        } else if (item.event_data.type === 'oral-questions') {
          content.push(
            { text: item.event_data.department, style: 'subheader' } as ContentText,
            { text: `Date: ${format(new Date(item.date), 'PPP')}`, style: 'content' } as ContentText
          );
        }

        content.push({ text: '', style: 'spacer', margin: [0, 0, 0, 20] } as ContentText);
        return content;
      })
    );
  }

  const docDefinition: TDocumentDefinitions = {
    header: {
      columns: [
        {
          text: 'W',
          font: 'Roboto',
          fontSize: 24,
          bold: true,
          color: COLORS.primaryForeground,
          margin: [40, -40, 0, 0]
        },
        {
          width: '*',
          text: 'WhatGov Export',
          alignment: 'right',
          color: COLORS.primaryForeground,
          style: 'metadata',
          margin: [0, -32, 40, 0]
        }
      ]
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: `Generated on ${format(new Date(), 'PPP')}`,
          alignment: 'left',
          margin: [40, 20, 0, 0],
          style: 'metadata'
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'right',
          margin: [0, 20, 40, 0],
          style: 'metadata'
        }
      ]
    }),
    content: allContent,
    styles: {
      sectionHeader: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 20]
      },
      itemHeader: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      metadata: {
        fontSize: 12,
        color: COLORS.muted,
        margin: [0, 0, 0, 10]
      },
      content: {
        fontSize: 12,
        margin: [0, 0, 0, 10]
      },
      spacer: {
        fontSize: 12,
        margin: [0, 0, 0, 20]
      }
    }
  };

  const filename = `saved_items_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
} 