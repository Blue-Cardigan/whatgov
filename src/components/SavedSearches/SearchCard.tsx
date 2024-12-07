import { formatDistanceToNow } from 'date-fns';
import type { AISearch } from '@/types/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DebateHeader } from '@/components/debates/DebateHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchCardProps {
  search: AISearch;
}

export function SearchCard({ search }: SearchCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSearchAgain = () => {
    router.push(`/search?q=${encodeURIComponent(search.query)}`);
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
          <Button variant="secondary" onClick={handleSearchAgain}>
            Search Again
          </Button>
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