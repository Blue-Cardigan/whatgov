import { Citation } from '@/types/search';
import ReactMarkdown from 'react-markdown';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { Children, cloneElement, isValidElement, ReactNode } from 'react';
import { InlineCitation } from '@/components/ui/inline-citation';
import { LoadingAnimation } from '@/components/ui/loading-animation';

interface StreamedResponseProps {
  streamingText: string;
  citations: Citation[];
  isLoading: boolean;
  query: string;
}

export function StreamedResponse({ streamingText, citations, isLoading }: StreamedResponseProps) {

  const formatCitationIndexes = (citations: Citation[]): string => {
    if (!citations || citations.length === 0) return '【】';

    const sortedIndexes = citations
      .map(c => c.citation_index)
      .filter(index => typeof index === 'number') // Ensure we only have valid numbers
      .sort((a, b) => a - b);

    if (sortedIndexes.length === 0) return '【】';

    // Find consecutive sequences
    const sequences: number[][] = [];
    let currentSeq: number[] = [];

    sortedIndexes.forEach((num, i) => {
      if (i === 0 || num !== sortedIndexes[i - 1] + 1) {
        if (currentSeq.length > 0) {
          sequences.push([...currentSeq]);
        }
        currentSeq = [num];
      } else {
        currentSeq.push(num);
      }
    });
    
    // Don't forget to push the last sequence
    if (currentSeq.length > 0) {
      sequences.push(currentSeq);
    }

    // Format sequences with null checks
    const formattedSequences = sequences.map(seq => {
      if (!seq || seq.length === 0) return '';
      if (seq.length === 1) return `${seq[0]}`;
      if (seq.length === 2) return seq.join(", ");
      return `${seq[0]}-${seq[seq.length - 1]}`;
    }).filter(Boolean); // Remove any empty strings

    return formattedSequences.length > 0 ? `【${formattedSequences.join(", ")}】` : '【】';
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
          return <span key={`unmatched-citation-${i}`}>{part}</span>;
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
              {Children.map(children, (child: ReactNode) => {
                if (typeof child === 'string') {
                  return renderWithCitations(child);
                }
                // Handle nested paragraph elements inside list items
                if (isValidElement(child)) {
                  return cloneElement<any>(child, {
                    ...child.props,
                    children: typeof child.props.children === 'string' 
                      ? renderWithCitations(child.props.children)
                      : child.props.children
                  });
                }
                return child;
              })}
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
    return <LoadingAnimation />;
  }

  if (!isLoading && !streamingText) {
    return (
      <div className="text-muted-foreground text-center py-8">
        <p>Enter a query to search through parliamentary records...</p>
      </div>
    );
  }

  return (
    <div className="prose dark:prose-invert prose-slate max-w-none">
      <MarkdownWithCitations text={streamingText} />
      {citations?.length > 0 && (
        <CitationsList citations={citations} />
      )}
    </div>
  );
} 