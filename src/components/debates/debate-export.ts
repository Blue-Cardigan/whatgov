import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { DebateItem } from '@/types';
import { HansardDebateResponse } from '@/types/hansard';
import { format } from 'date-fns';
import { getDebateType } from '@/lib/utils';
import type { ParsedAnalysisData, SpeakerPoint } from '@/components/debates/AnalysisData';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

const COLORS = {
  primary: '#449441',        // Parliamentary Green
  primaryForeground: '#fafafa',
  secondary: '#f0fdf4',
  muted: '#71717a',
  border: '#e4e4e7',
  background: '#ffffff',
  destructive: '#B50938',    // Red
  success: '#16a34a',        // Same as primary
  accent: '#22c55e',
};

const SYMBOLS = {
  calendar: '•',      // Standard bullet
  location: '›',      // Right-pointing arrow
  type: '»',          // Double right-pointing arrow
  analysis: '—',      // Em dash
  person: '·',        // Middle dot
  reference: '†',     // Dagger
  stat: '∙',          // Bullet operator
};

export async function exportDebateToPDF({ debate, hansardData }: {
  debate: DebateItem;
  hansardData?: HansardDebateResponse;
}) {
  if (pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else {
    pdfMake.vfs = pdfFonts;
  }

  const PAGE_WIDTH = 595.28;
  const CONTENT_WIDTH = PAGE_WIDTH - 80;
  const PILL_WIDTH = 120;
  const STAT_WIDTH = (CONTENT_WIDTH - 40) / 3;

  let parsedAnalysis: ParsedAnalysisData;
  try {
    parsedAnalysis = typeof debate.analysis === 'string' 
      ? JSON.parse(debate.analysis) 
      : debate.analysis;
  } catch (e) {
    parsedAnalysis = {
      main_content: debate.analysis as string,
      policy_terms: [],
      dates: [],
      data: []
    };
  }

  const date = format(new Date(debate.date), 'dd MMMM yyyy');
  const debateType = getDebateType(debate.type);

  const docDefinition: TDocumentDefinitions = {
    pageMargins: [40, 80, 40, 60] as [number, number, number, number],
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
              color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary,
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
            canvas: [
              {
                type: 'line',
                x1: 40,
                y1: 0,
                x2: PAGE_WIDTH - 40,
                y2: 0,
                lineWidth: 1,
                lineColor: COLORS.border
              }
            ]
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
              { text: debateType?.label || 'Debate', style: 'metadata' }
            ],
            alignment: 'right'
          }
        ],
        margin: [0, 0, 0, 30] as [number, number, number, number]
      },

      // Analysis Section
      {
        fillColor: COLORS.secondary,
        margin: [0, 0, 0, 30],
        padding: 20,
        layout: 'noBorders',
        table: {
          widths: [CONTENT_WIDTH],
          body: [[
            {
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
            }
          ]]
        }
      },

      // Policy Terms
      ...(parsedAnalysis.policy_terms?.length ? [{
        columns: parsedAnalysis.policy_terms.map(term => ({
          width: 'auto',
          text: term,
          style: 'pill',
          margin: [5, 0, 5, 0],
          padding: [10, 5],
          borderRadius: 12
        })),
        columnGap: 10,
        margin: [0, 0, 0, 30]
      }] : []),

      // Statistics
      ...(parsedAnalysis.data?.length ? [{
        columns: parsedAnalysis.data.map(stat => ({
          width: 'auto',
          stack: [
            {
              text: stat.value,
              style: 'statValue',
              alignment: 'center'
            },
            {
              text: stat.context,
              style: 'statContext',
              alignment: 'center'
            }
          ],
          margin: [5, 0],
          padding: [10, 10],
          borderRadius: 4
        })),
        columnGap: 10,
        margin: [0, 0, 0, 30]
      }] : []),

      // Speaker Points - Fixed typing
      ...(debate.speaker_points && Array.isArray(debate.speaker_points) && 
        debate.speaker_points.every((item: unknown): item is SpeakerPoint => 
          typeof item === 'object' && 
          item !== null && 
          'name' in item && 
          'contributions' in item &&
          Array.isArray((item as SpeakerPoint).contributions)
        ) ? 
        debate.speaker_points.map((speaker) => ({
          margin: [0, 0, 0, 20],
          padding: 20,
          fillColor: COLORS.background,
          table: {
            widths: [CONTENT_WIDTH],
            body: [[{
              stack: [
                // Speaker Header
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
                          text: `${speaker.party} ${SYMBOLS.calendar} ${speaker.constituency || speaker.role}`,
                          style: 'speakerMeta'
                        }
                      ]
                    }
                  ]
                },
                // Contributions
                ...speaker.contributions.map(contribution => ({
                  stack: [
                    contribution.type ? {
                      text: [
                        { text: `${SYMBOLS.type} `, color: COLORS.muted },
                        { text: contribution.type.charAt(0).toUpperCase() + contribution.type.slice(1), style: 'contributionType' }
                      ],
                      margin: [0, 10, 0, 5]
                    } : {},
                    {
                      text: contribution.content,
                      style: 'bodyText',
                      margin: [0, 0, 0, 5]
                    },
                    contribution.references?.length ? {
                      text: [
                        { text: `${SYMBOLS.reference} `, color: COLORS.muted },
                        { text: contribution.references.map((ref: { value: string }) => ref.value).join(' • '), style: 'references' }
                      ],
                      margin: [0, 0, 0, 10]
                    } : {}
                  ]
                }))
              ]
            }]]
          },
          layout: 'noBorders'
        })) 
        : []),

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
          },
          {
            text: [
              { text: `${SYMBOLS.reference} `, color: COLORS.muted },
              { text: 'Original Hansard record:', style: 'footerLabel' }
            ],
            margin: [0, 10, 0, 0]
          },
          {
            text: `https://hansard.parliament.uk/House/${debate.date}/debates/${debate.ext_id}`,
            link: `https://hansard.parliament.uk/House/${debate.date}/debates/${debate.ext_id}`,
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
        color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary
      },
      metadata: {
        fontSize: 10,
        color: COLORS.muted
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary
      },
      bodyText: {
        fontSize: 11,
        alignment: 'justify',
        lineHeight: 1.4,
        color: COLORS.muted
      },
      pill: {
        fontSize: 10,
        color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary,
        bold: true
      },
      statValue: {
        fontSize: 18,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary
      },
      statContext: {
        fontSize: 10,
        color: COLORS.muted
      },
      speakerName: {
        fontSize: 14,
        bold: true,
        color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary
      },
      speakerMeta: {
        fontSize: 10,
        color: COLORS.muted
      },
      contributionType: {
        fontSize: 10,
        color: COLORS.success,
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
        color: debate.house === 'Lords' ? COLORS.destructive : COLORS.primary,
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