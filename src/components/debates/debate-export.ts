import pdfMake from 'pdfmake/build/pdfmake';
import { DebateItem } from '@/types';
import { HansardDebateResponse } from '@/types/hansard';
import { format } from 'date-fns';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { ParsedAnalysisData, SpeakerPoint } from '@/types';
import { COLORS, SYMBOLS } from '@/lib/pdf-utilities';

interface ExportDebateProps {
  debate: DebateItem & {
    speaker_points?: SpeakerPoint[] | string[] | string;
  };
  hansardData?: HansardDebateResponse;
}

interface Contribution {
  content: string;
  references?: Array<{ text: string }>;
}

function processContribution(contribution: string | Contribution): Contribution {
  if (typeof contribution === 'string') {
    try {
      return JSON.parse(contribution) as Contribution;
    } catch {
      return { content: contribution };
    }
  }
  return contribution;
}

function processSpeakerPoints(points: SpeakerPoint[] | string[] | string): SpeakerPoint[] {
  if (typeof points === 'string') {
    try {
      return JSON.parse(points);
    } catch {
      return [];
    }
  }
  if (Array.isArray(points) && points.length > 0) {
    if (typeof points[0] === 'string') {
      return points.map(point => ({
        name: 'Unknown',
        role: 'Member',
        party: '',
        constituency: '',
        contributions: [{ content: point as string }]
      }));
    }
    return points as SpeakerPoint[];
  }
  return [];
}

export async function exportDebateToPDF({ debate }: ExportDebateProps) {
  const PAGE_WIDTH = 595.28;
  const CONTENT_WIDTH = PAGE_WIDTH - 80;
  let parsedAnalysis: ParsedAnalysisData;

  try {
    parsedAnalysis = typeof debate.analysis === 'string' 
      ? JSON.parse(debate.analysis) 
      : debate.analysis;
  } catch (e) {
    console.error('Error parsing analysis:', e);
    parsedAnalysis = {
      main_content: debate.analysis as string,
      policy_terms: [],
      dates: [],
      data: []
    };
  }

  const analysisSections: Content[] = [
    // Main Analysis Section
    {
      fillColor: COLORS.secondary,
      margin: [0, 0, 0, 30],
      layout: 'noBorders',
      table: {
        widths: [CONTENT_WIDTH],
        body: [[{
          stack: [
            {
              text: [
                { text: 'Key Analysis', style: 'sectionHeader' }
              ],
              margin: [0, 0, 0, 10]
            },
            {
              text: parsedAnalysis.main_content,
              style: 'bodyText'
            }
          ]
        }]]
      }
    }
  ];

  // Add Statistics Section if present
  if (parsedAnalysis.statistics && parsedAnalysis.statistics.length > 0) {
    analysisSections.push({
      margin: [0, 0, 0, 30],
      columns: parsedAnalysis.statistics.map(stat => ({
        width: '*',
        stack: [
          {
            text: stat.value,
            style: 'statValue',
            alignment: 'center'
          },
          {
            text: stat.context,
            style: 'statContext',
            alignment: 'center',
            margin: [10, 5, 10, 0]
          }
        ],
        margin: [10, 0]
      }))
    });
  }

  // Add Outcome Section if present
  if (parsedAnalysis.outcome) {
    analysisSections.push({
      margin: [0, 0, 0, 30],
      table: {
        widths: [CONTENT_WIDTH],
        body: [[{
          stack: [
            {
              text: [
                { text: `${SYMBOLS.analysis} `, color: COLORS.muted },
                { text: 'Outcome', style: 'sectionHeader' }
              ],
              margin: [0, 0, 0, 10]
            },
            {
              text: parsedAnalysis.outcome,
              style: 'outcomeText'
            }
          ]
        }]]
      },
      layout: 'noBorders'
    });
  }

  const date = format(new Date(debate.date), 'dd MMMM yyyy');
  const debateType = debate.type;
  const speakerPoints = processSpeakerPoints(debate.speaker_points || []);

  const docDefinition: TDocumentDefinitions = {
    pageMargins: [40, 80, 40, 60] as [number, number, number, number],
    header: {
      stack: [
        {
          canvas: [{
            type: 'rect',
            x: 0,
            y: 0,
            w: PAGE_WIDTH,
            h: 60,
            color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary,
          }]
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
              margin: [40, -40, 0, 0] as [number, number, number, number]
            },
            {
              width: '*',
              text: 'WhatGov Report',
              alignment: 'right',
              color: COLORS.primaryForeground,
              style: 'metadata',
              margin: [0, -32, 40, 0] as [number, number, number, number]
            }
          ]
        }
      ]
    },
    footer: function(currentPage: number, pageCount: number) {
      return {
        stack: [
          {
            canvas: [{
              type: 'line',
              x1: 40,
              y1: 0,
              x2: PAGE_WIDTH - 40,
              y2: 0,
              lineWidth: 1,
              lineColor: COLORS.border
            }]
          },
          {
            columns: [
              { 
                text: `Generated on ${format(new Date(), 'dd MMM yyyy')}`,
                alignment: 'left',
                margin: [40, 10, 0, 0],
                fontSize: 8,
                color: COLORS.muted
              },
              {
                text: `Page ${currentPage} of ${pageCount}`,
                alignment: 'right',
                margin: [0, 10, 40, 0],
                fontSize: 8,
                color: COLORS.muted
              }
            ]
          }
        ]
      };
    },
    content: [
      // Header Section
      {
        text: debate.title,
        style: 'header',
        margin: [0, 0, 0, 10] as [number, number, number, number]
      },
      // Metadata Section
      {
        columns: [
          {
            text: [
              { text: `${SYMBOLS.calendar} `, fontSize: 12, color: COLORS.muted },
              { text: date, style: 'metadata' }
            ]
          },
          {
            text: [
              { text: `${SYMBOLS.location} `, fontSize: 12, color: COLORS.muted },
              { text: debate.house, style: 'metadata' }
            ]
          },
          {
            text: [
              { text: `${SYMBOLS.type} `, fontSize: 12, color: COLORS.muted },
              { text: debateType || 'Debate', style: 'metadata' }
            ],
            alignment: 'right'
          }
        ],
        margin: [0, 0, 0, 30] as [number, number, number, number]
      },
      // Analysis Sections
      ...analysisSections,
      // Speaker Points Section
      ...speakerPoints.map(speaker => ({
        margin: [0, 0, 0, 20],
        padding: 20,
        fillColor: COLORS.background,
        table: {
          widths: [CONTENT_WIDTH],
          body: [[{
            stack: [
              {
                columns: [
                  {
                    stack: [
                      {
                        text: [
                          { text: `${SYMBOLS.person} `, color: COLORS.muted },
                          { text: speaker.name, style: 'speakerName' }
                        ]
                      },
                      {
                        text: `${speaker.party || 'Unknown Party'} ${SYMBOLS.calendar} ${speaker.constituency || speaker.role || ''}`,
                        style: 'speakerMeta'
                      }
                    ]
                  }
                ]
              },
              ...speaker.contributions.map(contribution => {
                const processed = processContribution(contribution);
                return {
                  stack: [
                    {
                      text: processed.content,
                      style: 'bodyText',
                      margin: [0, 0, 0, 5]
                    }
                  ]
                };
              })
            ]
          }]]
        },
        layout: 'noBorders'
      })),
      // Footer Links
      {
        stack: [
          {
            text: [
              { text: `${SYMBOLS.reference} `, color: COLORS.muted },
              { text: 'View this debate online:', style: 'footerLabel' }
            ]
          },
          {
            text: `https://whatgov.uk/debate/${debate.ext_id}`,
            link: `https://whatgov.uk/debate/${debate.ext_id}`,
            style: 'footerLink'
          }
        ],
        margin: [0, 30, 0, 0]
      }
    ] as Content[],
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary
      },
      metadata: {
        fontSize: 10,
        color: COLORS.muted
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary
      },
      bodyText: {
        fontSize: 11,
        alignment: 'justify',
        lineHeight: 1.4,
        color: COLORS.muted
      },
      pill: {
        fontSize: 10,
        color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary,
        bold: true
      },
      statValue: {
        fontSize: 18,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary
      },
      statContext: {
        fontSize: 10,
        color: COLORS.muted
      },
      speakerName: {
        fontSize: 14,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary
      },
      speakerMeta: {
        fontSize: 10,
        color: COLORS.muted
      },
      contributionType: {
        fontSize: 10,
        color: COLORS.primary,
        bold: true
      },
      references: {
        fontSize: 9,
        color: COLORS.muted,
        italics: true
      },
      footerLabel: {
        fontSize: 9,
        color: COLORS.muted
      },
      footerLink: {
        fontSize: 9,
        color: debate.house === 'Lords' ? COLORS.warning : COLORS.primary,
        decoration: 'underline'
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  const fileName = `${debate.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
}