import { formatDistanceToNow } from 'date-fns';
import type { SavedSearch } from '@/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react';
import { Children, useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportToPDF } from '@/lib/pdf-export';
import ReactMarkdown from 'react-markdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InlineCitation } from '@/components/ui/inline-citation';

interface SearchCardProps {
  search: SavedSearch;
  onDelete: () => void;
}

export function SearchCard({ search, onDelete }: SearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const handleSearchAgain = () => {
    const searchState = {
      searchType: search.search_type,
      ...(search.search_type === 'ai' 
        ? {
            aiSearch: {
              query: search.query,
              streamingText: '', // Clear the streaming text
              citations: [], // Clear the citations
              isLoading: true // Set loading to true to trigger search
            }
          }
        : {
            searchParams: {
              ...search.query_state,
              searchTerm: search.query,
              skip: 0,
              take: 10,
              orderBy: 'SittingDateDesc'
            },
            results: null, // Clear the results to trigger new search
            isLoading: true // Set loading to true to trigger search
          }
      )
    };
    
    sessionStorage.setItem('searchState', JSON.stringify(searchState));
    router.push(`/search?tab=${search.search_type}&execute=true`); // Add execute parameter
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportToPDF({
        title: search.query,
        content: search.response,
        citations: search.citations,
        date: new Date(search.created_at),
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderHansardMetrics = () => {
    if (search.search_type !== 'hansard' || !search.query_state) return null;
    
    const results = JSON.parse(search.response) || {};
    const metrics = [
      { label: 'Total Contributions', value: results.TotalContributions },
      { label: 'Total Debates', value: results.TotalDebates },
      { label: 'Written Statements', value: results.TotalWrittenStatements },
      { label: 'Written Answers', value: results.TotalWrittenAnswers },
    ];

    return (
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        {metrics.map(({ label, value }) => (
          <div key={label} className="bg-muted p-2 rounded">
            <div className="font-medium">{label}</div>
            <div className="text-muted-foreground">{value || 0}</div>
          </div>
        ))}
      </div>
    );
  };

  // Replace processText with MarkdownWithCitations component
  const MarkdownWithCitations = ({ text }: { text: string }) => {
    const renderWithCitations = (content: string) => {
      const parts = content.split(/(【\d+】)/g);
      return parts.map((part, i) => {
        const citationMatch = part.match(/【(\d+)】/);
        if (citationMatch && search.citations) {
          const citationNumber = parseInt(citationMatch[1], 10);
          try {
            // Safely parse the citations array from the database
            const citations = search.citations.map(c => {
              try {
                return typeof c === 'string' ? JSON.parse(c) : c;
              } catch (e) {
                console.error('Failed to parse citation:', c);
                return null;
              }
            }).filter(Boolean);

            const citation = citations.find(c => c?.citation_index === citationNumber);
            if (citation) {
              return (
                <InlineCitation
                  key={`citation-${citationNumber}-${i}`}
                  citation={citation}
                />
              );
            }
          } catch (e) {
            console.error('Error processing citations:', e);
          }
        }
        return part ? <span key={`text-${i}`}>{part}</span> : null;
      }).filter(Boolean);
    };

    return (
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-foreground">
              {typeof children === 'string' 
                ? renderWithCitations(children)
                : children}
            </p>
          ),
          li: ({ children }) => (
            <li className="mb-1 text-foreground">
              {Children.map(children, (child: any) =>
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
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{search.query}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete saved search?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your saved search.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      {/* Move onDelete to the AlertDialogAction onClick directly */}
                      <AlertDialogAction onClick={onDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </TooltipTrigger>
                <TooltipContent>
                  Delete search
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {search.search_type === 'ai' && (
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
            )}
            <Button variant="secondary" onClick={handleSearchAgain}>
              Search Again
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {search.search_type === 'ai' ? (
            <div className="prose dark:prose-invert prose-sm max-w-none mb-4">
              <MarkdownWithCitations 
                text={isOpen ? search.response : search.response.slice(0, 200) + '...'}
              />
            </div>
          ) : (
            renderHansardMetrics()
          )}

          {search.response.length > 200 && search.search_type === 'ai' && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full">
                {isOpen ? (
                  <div className="flex items-center">
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Show Less
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show More
                  </div>
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </Collapsible>
      </CardContent>
    </Card>
  );
} 