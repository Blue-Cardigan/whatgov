import { Content } from 'pdfmake/interfaces';
import { COLORS } from '@/lib/pdf-utilities';

function processBoldText(text: string): (string | { text: string; bold: true })[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { 
        text: part.slice(2, -2),
        bold: true
      };
    }
    return part;
  });
}

function processMarkdownLine(line: string): Content {
  // Replace citation markers
  const processedLine = line.replace(/【(\d+)】/g, '[$1]');

  // Common margins
  const standardMargin: [number, number, number, number] = [0, 2, 0, 2];
  const headerMargin: [number, number, number, number] = [0, 10, 0, 5];
  const subheaderMargin: [number, number, number, number] = [0, 8, 0, 4];
  const listItemMargin: [number, number, number, number] = [10, 2, 0, 2];
  const subListItemMargin: [number, number, number, number] = [20, 1, 0, 1];

  // Handle headers
  if (processedLine.startsWith('# ')) {
    return { 
      text: processBoldText(processedLine.substring(2)),
      style: 'header',
      margin: headerMargin 
    };
  }

  if (processedLine.startsWith('## ')) {
    return { 
      text: processBoldText(processedLine.substring(3)),
      style: 'subheader',
      margin: subheaderMargin 
    };
  }

  // Handle bullet lists with nesting
  if (processedLine.startsWith('- ')) {
    const content = processedLine.substring(2);
    return { 
      text: [
        { text: '• ', color: COLORS.muted },
        ...processBoldText(content)
      ],
      style: 'listItem',
      margin: listItemMargin
    };
  }

  if (processedLine.startsWith('  • ')) {
    const content = processedLine.substring(4);
    return { 
      text: [
        { text: '◦ ', color: COLORS.muted },
        ...processBoldText(content)
      ],
      style: 'subListItem',
      margin: subListItemMargin
    };
  }

  // Handle statistics
  const statMatch = processedLine.match(/^([\d.,]+[%kmKMB]*|£[\d.,]+[kmKMB]*)\s*:\s*(.+)/);
  if (statMatch) {
    return {
      text: [
        { text: statMatch[1], style: 'statValue' },
        { text: `: ${statMatch[2]}`, style: 'bodyText' }
      ],
      margin: standardMargin
    };
  }

  // Handle regular text with bold sections
  if (processedLine.includes('**')) {
    return {
      text: processBoldText(processedLine),
      style: 'bodyText',
      margin: standardMargin
    };
  }

  // Regular text
  return { 
    text: processedLine,
    style: 'bodyText',
    margin: standardMargin
  };
}

export function parseAndFormatContent(content: string): Content[] {
  try {
    // Try to parse as JSON first
    const parsedContent = JSON.parse(content);
    
    if (parsedContent.outcome || parsedContent.main_content) {
      const sections: Content[] = [];

      // Main content section
      if (parsedContent.main_content) {
        sections.push({
          text: parsedContent.main_content,
          style: 'bodyText',
          margin: [0, 0, 0, 20]
        });
      }

      // Statistics section
      if (parsedContent.statistics?.length) {
        sections.push({
          text: 'Key Statistics',
          style: 'sectionHeader',
          margin: [0, 10, 0, 10]
        });

        parsedContent.statistics.forEach((stat: { value: string; context: string }) => {
          sections.push({
            columns: [
              {
                width: 'auto',
                text: stat.value,
                style: 'statValue',
                margin: [0, 0, 10, 10]
              },
              {
                width: '*',
                text: stat.context,
                style: 'bodyText',
                margin: [0, 4, 0, 10]
              }
            ]
          });
        });
      }

      // Outcome section
      if (parsedContent.outcome) {
        sections.push(
          {
            text: 'Outcome',
            style: 'sectionHeader',
            margin: [0, 10, 0, 10]
          },
          {
            text: parsedContent.outcome,
            style: 'outcomeText',
            margin: [0, 0, 0, 20]
          }
        );
      }

      return sections;
    }
  } catch (e) {
    console.error('Error parsing content:', e);
    // If not JSON or parsing fails, process as markdown
  }

  // Process as markdown if JSON parsing fails or content is plain text
  return content
    .split('\n')
    .map(line => processMarkdownLine(line))
    .filter(line => line !== '');
}

export const additionalStyles = {
  outcomeText: {
    fontSize: 11,
    alignment: 'justify',
    lineHeight: 1.4,
    color: COLORS.primary,
    italics: true
  },
  quote: {
    fontSize: 11,
    lineHeight: 1.4,
    color: COLORS.muted,
    italics: true,
    margin: [20, 10, 20, 10],
    borderLeft: true,
    borderColor: COLORS.primary,
    paddingLeft: 10
  },
  statValue: {
    fontSize: 16,
    bold: true,
    color: COLORS.primary
  }
};