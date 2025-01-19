import { format } from 'date-fns';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Debate, SavedSearch } from '@/types/search';
import type { TimeSlot } from '@/types/calendar';
import { exportToPDF } from '@/lib/pdf-export';
import { COLORS, PAGE_WIDTH } from './pdf-utilities';
import pdfMake from 'pdfmake/build/pdfmake';

interface ExportOptions {
    title: string;
    content: string;
    date: Date;
    citations?: string[];
    searchType: 'ai' | 'hansard' | 'calendar' | 'mp';
    latestContribution?: {
      memberName: string;
      house: string;
      debateSection: string;
      contributionText: string;
      sittingDate: string;
      debateExtId: string;
    };
    doc?: TDocumentDefinitions;
    markdown?: boolean;
    returnContent?: boolean;
  }

interface SavedCalendarItem {
  id: string;
  user_id: string;
  event_id: string;
  event_data: TimeSlot;
  date: string;
  created_at: string;
  is_unread?: boolean;
  debate_ids?: string[];
}

// Ensure we always return an array of Content
const getExportContent = async (options: ExportOptions): Promise<Content[]> => {
const result = await exportToPDF(options);
// If result is undefined or null, return empty array
if (!result) return [];
// If result is already an array, return it
if (Array.isArray(result)) return result;
// If result is a single Content object, wrap it in an array
return [result];
};

async function formatSearchContent(search: SavedSearch): Promise<Content[]> {
    try {
      const defaultReturn = [{
        text: search.response,
        style: 'bodyText'
      }];
  
      switch (search.search_type) {
        case 'ai':
          return await getExportContent({
            title: search.query,
            content: search.response || '',
            date: new Date(search.created_at),
            citations: search.citations || [],
            searchType: 'ai',
            markdown: true,
            returnContent: true
          });
  
        case 'hansard':
          return await getExportContent({
            title: search.query,
            content: search.response || '',
            date: new Date(search.created_at),
            citations: search.citations || [],
            searchType: 'hansard',
            markdown: true,
            returnContent: true
          });
  
        case 'mp':
          const responseData = JSON.parse(search.response);
          return await getExportContent({
            title: search.query,
            content: JSON.stringify(responseData.Debates) || '',
            date: new Date(search.created_at),
            citations: responseData.Debates?.map((d: Debate) => d.debate_id) || [],
            searchType: 'mp',
            markdown: true,
            returnContent: true
          });
  
        default:
          return defaultReturn;
      }
    } catch (error) {
      console.error(`Error formatting search content for ${search.search_type}:`, error);
      return [{
        text: `Error processing ${search.search_type} search content`,
        style: 'bodyText',
        color: COLORS.warning
      }];
    }
  }

async function formatCalendarContent(item: SavedCalendarItem): Promise<Content[]> {
  try {
    const title = item.event_data.edm?.title || 
                 (item.event_data.type === 'oral-questions' ? `Oral Questions: ${item.event_data.department}` :
                 item.event_data.event?.title || 'Calendar Event');

    return await getExportContent({
      title,
      content: JSON.stringify(item.event_data),
      date: new Date(item.created_at),
      citations: item.debate_ids || [],
      searchType: 'calendar',
      markdown: true,
      returnContent: true
    });
  } catch (error) {
    console.error('Error formatting calendar content:', error);
    return [{
      text: 'Error processing calendar content',
      style: 'bodyText',
      color: COLORS.warning
    }];
  }
}

export async function exportAllToPDF(searches: SavedSearch[], calendarItems: SavedCalendarItem[]) {
  const allContent: Content[] = [];

  // Add searches grouped by type
  if (searches.length > 0) {
    const searchTypes = ['ai', 'hansard', 'mp'] as const;
    
    for (const type of searchTypes) {
      const typeSearches = searches.filter(s => s.search_type === type);
      if (typeSearches.length > 0) {
        allContent.push(
          { text: `${type.toUpperCase()} Searches`, style: 'sectionHeader', pageBreak: allContent.length > 0 ? 'before' : undefined }
        );

        for (const search of typeSearches) {
          const content = await formatSearchContent(search);
          allContent.push(
            { text: search.query, style: 'itemHeader' },
            { 
              text: `Created ${format(new Date(search.created_at), 'PPP')}`,
              style: 'metadata'
            },
            ...content,
            { text: '', style: 'spacer' }
          );
        }
      }
    }
  }

  // Add calendar items
  if (calendarItems.length > 0) {
    allContent.push(
      { text: 'Calendar Items', style: 'sectionHeader', pageBreak: 'before' }
    );

    for (const item of calendarItems) {
      const content = await formatCalendarContent(item);
      allContent.push(
        ...content,
        { text: '', style: 'spacer' }
      );
    }
  }

  const docDefinition: TDocumentDefinitions = {
    pageMargins: [40, 80, 40, 60],
    header: {
      stack: [
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: PAGE_WIDTH,
              h: 60,
              color: COLORS.primary,
            }
          ]
        },
        {
          columns: [
            {
              width: 40,
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
    defaultStyle: {
      font: 'Roboto'
    }
  };

  const filename = `whatgov_export_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}