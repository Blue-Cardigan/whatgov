import pdfMake from 'pdfmake/build/pdfmake';
import { format } from 'date-fns';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { COLORS, SYMBOLS, PAGE_WIDTH } from './pdf-utilities';

interface ExportOptions {
  title: string;
  content: string;
  date: Date;
  citations?: string[];
  searchType: 'ai' | 'hansard' | 'calendar';
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

const processMarkdownLine = (line: string): Content => {
  // Replace citation markers with standard brackets
  const processedLine = line.replace(/【(\d+)】/g, '[$1]');

  // Common margin definition that matches pdfmake's type requirements
  const standardMargin: [number, number, number, number] = [0, 2, 0, 2];
  const headerMargin: [number, number, number, number] = [0, 10, 0, 5];
  const subheaderMargin: [number, number, number, number] = [0, 8, 0, 4];
  const listItemMargin: [number, number, number, number] = [10, 2, 0, 2];
  const subListItemMargin: [number, number, number, number] = [20, 1, 0, 1];

  // Handle numbered lists with bold text
  const numberedListMatch = processedLine.match(/^(\d+\.\s+)(.*)/);
  if (numberedListMatch) {
    const [, number, content] = numberedListMatch;
    const parts = content.split(/(\*\*.*?\*\*)/g).map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), bold: true };
      }
      return { text: part };
    });
    return {
      text: [
        { text: number, style: 'listNumber' },
        ...parts
      ],
      style: 'bodyText',
      margin: standardMargin
    };
  }

  // Handle headers
  if (processedLine.startsWith('# ')) {
    return { 
      text: processedLine.substring(2), 
      style: 'header', 
      margin: headerMargin 
    };
  }
  if (processedLine.startsWith('## ')) {
    return { 
      text: processedLine.substring(3), 
      style: 'subheader', 
      margin: subheaderMargin 
    };
  }

  // Handle bullet lists
  if (processedLine.startsWith('- ')) {
    const content = processedLine.substring(2);
    const parts = content.split(/(\*\*.*?\*\*)/g).map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), bold: true };
      }
      return { text: part };
    });
    return { 
      text: parts, 
      style: 'listItem', 
      margin: listItemMargin 
    };
  }

  // Handle sub-bullet lists
  if (processedLine.startsWith('  • ')) {
    const content = processedLine.substring(4);
    const parts = content.split(/(\*\*.*?\*\*)/g).map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), bold: true };
      }
      return { text: part };
    });
    return { 
      text: parts, 
      style: 'subListItem', 
      margin: subListItemMargin 
    };
  }

  // Handle regular text with bold formatting
  if (processedLine.match(/\*\*.*?\*\*/)) {
    const parts = processedLine.split(/(\*\*.*?\*\*)/g).map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), bold: true };
      }
      return { text: part };
    });
    return { 
      text: parts, 
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
};

export async function exportToPDF({ 
  title, 
  content, 
  date, 
  citations = [], 
  searchType,
  latestContribution,
  doc,
  markdown,
  returnContent
}: ExportOptions) {

  const getContentStack = (): Content[] => {
    const stack: Content[] = [
      // Header
      {
        text: title,
        style: 'header',
        margin: [0, 0, 0, 10]
      },
      {
        columns: [
          {
            text: [
              { text: `${SYMBOLS.calendar} `, fontSize: 12, color: COLORS.muted },
              { text: format(date, 'PPP'), style: 'metadata' }
            ]
          },
          {
            text: [
              { text: `${SYMBOLS.type} `, fontSize: 12, color: COLORS.muted },
              { text: searchType === 'ai' ? 'AI Research' : 
                      searchType === 'hansard' ? 'Hansard Search' : 
                      'Calendar Event', 
                style: 'metadata' 
              }
            ],
            alignment: 'right'
          }
        ],
        margin: [0, 0, 0, 20]
      }
    ];

    // Content section based on type
    if (searchType === 'ai') {
      if (markdown) {
        // Process markdown content using the new processor
        const processedContent = content
          .split('\n')
          .map(processMarkdownLine)
          .filter(Boolean);

        stack.push(...processedContent);
      } else {
        stack.push({
          text: content,
          style: 'bodyText',
          margin: [0, 0, 0, 20]
        });
      }

      // Add citations if present
      if (citations.length > 0) {
        stack.push(
          {
            text: 'Sources',
            style: 'sectionHeader',
            margin: [0, 10, 0, 5] as [number, number, number, number]
          },
          ...citations.map((citation, index) => ({
            text: [
              { text: `${index + 1}. `, style: 'citationNumber' },
              { 
                text: `https://whatgov.uk/debate/${citation}`,
                link: `https://whatgov.uk/debate/${citation}`,
                style: 'citationLink'
              }
            ],
            margin: [0, 0, 0, 5] as [number, number, number, number]
          }))
        );
      }
    } else if (searchType === 'hansard') {
      // Format Hansard content
      try {
        const response = typeof content === 'string' ? JSON.parse(content) : content;
        
        if (response.summary) {
          stack.push(
            {
              text: 'Summary',
              style: 'sectionHeader',
              margin: [0, 0, 0, 10]
            },
            {
              columns: [
                {
                  width: 'auto',
                  stack: [
                    {
                      text: response.summary.TotalContributions.toString(),
                      style: 'statValue',
                      alignment: 'center'
                    },
                    {
                      text: 'Contributions',
                      style: 'statLabel',
                      alignment: 'center'
                    }
                  ]
                },
                {
                  width: 'auto',
                  stack: [
                    {
                      text: response.summary.TotalDebates.toString(),
                      style: 'statValue',
                      alignment: 'center'
                    },
                    {
                      text: 'Debates',
                      style: 'statLabel',
                      alignment: 'center'
                    }
                  ]
                },
                {
                  width: '*',
                  stack: [
                    {
                      text: response.summary.TotalWrittenStatements.toString(),
                      style: 'statValue',
                      alignment: 'center'
                    },
                    {
                      text: 'Written Statements',
                      style: 'statLabel',
                      alignment: 'center'
                    }
                  ]
                }
              ],
              margin: [0, 0, 0, 20]
            }
          );
        }

        // Add latest contribution if available
        if (latestContribution) {
          stack.push(
            {
              text: 'Latest Contribution',
              style: 'sectionHeader',
              margin: [0, 0, 0, 10]
            },
            {
              stack: [
                {
                  text: [
                    { text: `${SYMBOLS.person} `, color: COLORS.muted },
                    { text: latestContribution.memberName, style: 'contributorName' }
                  ]
                },
                {
                  text: latestContribution.debateSection,
                  style: 'debateSection',
                  margin: [0, 5, 0, 5]
                },
                {
                  text: latestContribution.contributionText,
                  style: 'bodyText',
                  margin: [0, 0, 0, 10]
                },
                {
                  text: [
                    { text: `${SYMBOLS.calendar} `, color: COLORS.muted },
                    { 
                      text: format(new Date(latestContribution.sittingDate), 'PPP'),
                      style: 'metadata'
                    }
                  ]
                }
              ],
              margin: [0, 0, 0, 20]
            }
          );
        }
      } catch (e) {
        console.warn('Failed to parse Hansard JSON:', e);
        stack.push({
          text: content,
          style: 'bodyText'
        });
      }
    } else {
      if (searchType === 'calendar' && markdown) {
        // Process markdown content
        const processedContent = content.split('\n').map(line => {
          if (line.startsWith('# ')) {
            return { text: line.substring(2), style: 'header', margin: [0, 10, 0, 5] } as Content;
          }
          if (line.startsWith('## ')) {
            return { text: line.substring(3), style: 'subheader', margin: [0, 8, 0, 4] } as Content;
          }
          if (line.startsWith('- ')) {
            return { text: line, style: 'listItem', margin: [10, 2, 0, 2] } as Content;
          }
          if (line.startsWith('  • ')) {
            return { text: line, style: 'subListItem', margin: [20, 1, 0, 1] } as Content;
          }
          return { text: line, style: 'bodyText', margin: [0, 2, 0, 2] } as Content;
        });

        stack.push(...processedContent);
      } else {
        // Calendar event content
        stack.push({
          text: content,
          style: 'bodyText'
        } as Content);
      }
    }

    return stack;
  };

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
    content: getContentStack(),
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: COLORS.primary
      },
      metadata: {
        fontSize: 10,
        color: COLORS.muted
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: COLORS.primary,
        margin: [0, 10, 0, 5]
      },
      bodyText: {
        fontSize: 11,
        lineHeight: 1.4,
        color: COLORS.muted
      },
      citationNumber: {
        fontSize: 10,
        color: COLORS.primary
      },
      citationLink: {
        fontSize: 10,
        color: COLORS.primary,
        decoration: 'underline'
      },
      statValue: {
        fontSize: 24,
        bold: true,
        color: COLORS.primary
      },
      statLabel: {
        fontSize: 10,
        color: COLORS.muted
      },
      contributorName: {
        fontSize: 12,
        bold: true,
        color: COLORS.primary
      },
      debateSection: {
        fontSize: 11,
        color: COLORS.muted,
        italics: true
      },
      subheader: {
        fontSize: 14,
        bold: true,
        color: COLORS.primary,
        margin: [0, 8, 0, 4]
      },
      listItem: {
        fontSize: 11,
        lineHeight: 1.4,
        color: COLORS.muted
      },
      subListItem: {
        fontSize: 10,
        lineHeight: 1.3,
        color: COLORS.muted,
        italics: true
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  if (returnContent) {
    // Return just the content stack for bulk exports
    return getContentStack();
  } else if (doc) {
    // For multi-item exports, return the content stack
    return docDefinition.content;
  } else {
    // For single item exports, create and download the PDF
    const fileName = `${searchType}_${format(date, 'yyyy-MM-dd')}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
  }
} 