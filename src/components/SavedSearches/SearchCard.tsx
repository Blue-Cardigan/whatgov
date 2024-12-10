import { formatDistanceToNow } from 'date-fns';
import type { SavedSearch } from '@/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportToPDF } from '@/lib/pdf-export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchCardProps {
  search: SavedSearch;
}

export function SearchCard({ search }: SearchCardProps) {
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
              streamingText: search.response,
              citations: search.citations.map((citation: string) => ({
                index: citation.indexOf(search.query),
                url: citation
              })),
              isLoading: false
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
            results: JSON.parse(search.response),
            isLoading: false
          }
      )
    };
    
    sessionStorage.setItem('searchState', JSON.stringify(searchState));
    router.push(`/search?tab=${search.search_type}`);
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
            <Button variant="secondary" onClick={handleSearchAgain}>
              Search Again
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="prose dark:prose-invert prose-sm max-w-none mb-4">
            <p>{search.response.slice(0, isOpen ? undefined : 200)}
              {!isOpen && search.response.length > 200 && '...'}
            </p>
          </div>

          {search.response.length > 200 && (
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

          <CollapsibleContent>
            {search.citations.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <h3 className="text-sm font-semibold">Sources:</h3>
                <div className="space-y-3">
                  {search.citations.map((citation, index) => {
                    const match = citation.match(/\[(\d+)\]\s+(.+?)\.txt$/);
                    if (!match) return null;
                    const extId = match[2];
                    
                    return (
                      <DebateHeader 
                        key={index}
                        extId={extId}
                        className="border rounded-md"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
} 