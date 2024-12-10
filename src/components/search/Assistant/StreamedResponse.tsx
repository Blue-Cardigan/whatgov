import { processCitations } from '@/lib/openai-api';
import ReactMarkdown from 'react-markdown';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { SaveSearchButton } from './SaveSearchButton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToPDF } from '@/lib/pdf-export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from 'react';

interface StreamedResponseProps {
  streamingText: string;
  citations: string[];
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
        citations,
        date: new Date(),
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
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

  // Process the text to wrap citations in markdown links
  const processedText = (streamingText || '').split(/(\[\d+\])/).map((part) => {
    const citationMatch = part.match(/\[(\d+)\]/);
    if (citationMatch) {
      const citationIndex = parseInt(citationMatch[1]) - 1;
      const citation = citations[citationIndex];
      if (citation) {
        const { url } = processCitations('', [citation]).citationLinks[0];
        return `[${part}](${url})`;
      }
    }
    return part;
  }).join('');

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
                  citations: citations.map((url, index) => ({
                    index,
                    url
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
              {children}
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
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted pl-4 italic my-4 text-muted-foreground">
              {children}
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
        {processedText}
      </ReactMarkdown>

      {citations.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border space-y-4">
          <h3 className="text-lg font-semibold mb-3 text-foreground">Sources:</h3>
          <div className="space-y-3">
            {citations.map((citation, index) => {
              const match = citation.match(/\[(\d+)\]\s+(.+?)\.txt$/);
              if (!match) return null;
              const extId = match[2];
              
              return (
                <DebateHeader 
                  key={index}
                  extId={extId}
                  className="border border-border"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 