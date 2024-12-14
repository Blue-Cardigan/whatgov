import { Citation } from '@/types/search';
import ReactMarkdown from 'react-markdown';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { SaveSearchButton } from '../SaveSearchButton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/lib/pdf-export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Children, ReactNode, useState } from 'react';
import { InlineCitation } from '@/components/ui/inline-citation';

interface StreamedResponseProps {
  streamingText: string;
  citations: Citation[];
  isLoading: boolean;
  query: string;
}

export function StreamedResponse({ streamingText, citations, isLoading, query }: StreamedResponseProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportToPDF({
        title: query,
        content: streamingText,
        citations: citations.map(citation => citation.chunk_text),
        date: new Date(),
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCitationIndexes = (citations: Citation[]): string => {
    const sortedIndexes = citations
      .map(c => c.citation_index)
      .sort((a, b) => a - b);

    // Find consecutive sequences
    const sequences: number[][] = [];
    let currentSeq: number[] = [];

    sortedIndexes.forEach((num, i) => {
      if (i === 0 || num !== sortedIndexes[i - 1] + 1) {
        if (currentSeq.length > 0) {
          sequences.push(currentSeq);
        }
        currentSeq = [num];
      } else {
        currentSeq.push(num);
      }
    });
    if (currentSeq.length > 0) {
      sequences.push(currentSeq);
    }

    // Format sequences
    const formattedSequences = sequences.map(seq => {
      if (seq.length === 1) return seq[0].toString();
      if (seq.length === 2) return seq.join(", ");
      return `${seq[0]}-${seq[seq.length - 1]}`;
    });

    return `【${formattedSequences.join(", ")}】`;
  };

  const CitationsList = ({ citations }: { citations: Citation[] }) => {
    if (!citations || citations.length === 0) return null;

    const groupedCitations = citations.reduce((acc, citation) => {
      const existing = acc.find(g => g.debate_id === citation.debate_id);
      if (existing) {
        existing.citations.push(citation);
      } else {
        acc.push({ 
          debate_id: citation.debate_id, 
          citations: [citation] 
        });
      }
      return acc;
    }, [] as { debate_id: string; citations: Citation[] }[]);

    return (
      <div className="mt-8 border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Sources</h3>
        <div className="space-y-4">
          {groupedCitations.map(({ debate_id, citations: groupCitations }) => (
            <div 
              key={debate_id}
              className="flex gap-2"
            >
              <div className="text-muted-foreground font-mono whitespace-nowrap">
                {formatCitationIndexes(groupCitations)}
              </div>
              <DebateHeader 
                extId={debate_id} 
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MarkdownWithCitations = ({ text }: { text: string }) => {
    const renderWithCitations = (content: string) => {
      const parts = content.split(/(【\d+】)/g);
      return parts.map((part, i) => {
        const citationMatch = part.match(/【(\d+)】/);
        if (citationMatch) {
          const citationNumber = parseInt(citationMatch[1], 10);
          const citation = citations.find(c => c.citation_index === citationNumber);
          if (citation) {
            return (
              <InlineCitation
                key={`citation-${citationNumber}-${i}`}
                citation={citation}
              />
            );
          }
          return <span key={`unmatched-citation-${i}`}>【{citationNumber}】</span>;
        }
        return part ? <span key={`text-${i}`}>{part}</span> : null;
      }).filter(Boolean);
    };

    return (
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:text-primary-foreground hover:bg-primary transition-colors no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-foreground">
              {typeof children === 'string' 
                ? renderWithCitations(children)
                : children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mb-1 text-foreground">
              {Children.map(children, (child: ReactNode) =>
                typeof child === 'string' ? renderWithCitations(child) : child
              )}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted pl-4 italic my-4 text-muted-foreground">
              {typeof children === 'string'
                ? renderWithCitations(children)
                : children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground">
              {children}
            </em>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  if (isLoading && !streamingText) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Searching through parliamentary records...</p>
        </div>
      </div>
    );
  }

  if (!streamingText) {
    return (
      <div className="text-muted-foreground text-center py-8">
        <p>Enter a query to search through parliamentary records...</p>
        <p className="text-sm mt-2">Example: &ldquo;What has been said about climate change this week?&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="prose dark:prose-invert prose-slate max-w-none">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {streamingText && !isLoading && (
            <>
              <SaveSearchButton
                aiSearch={{
                  query,
                  streamingText,
                  citations: citations.map(citation => ({
                    citation_index: citation.citation_index,
                    debate_id: citation.debate_id,
                    chunk_text: citation.chunk_text
                  }))
                }}
                searchType="ai"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Export to PDF
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      <MarkdownWithCitations text={streamingText} />

      <CitationsList citations={citations} />
    </div>
  );
} 