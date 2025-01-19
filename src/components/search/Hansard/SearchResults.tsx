import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ExternalLink } from "lucide-react";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { locationColors, partyColours } from '@/lib/utils';
import { FormattedMarkdown } from "@/lib/utils";
import type { SearchParams } from '@/types/search';
import { Button } from "@/components/ui/button";

interface Debate {
  ext_id: string;
  title: string;
  type: string;
  house: string;
  date: string;
  analysis: {
    outcome: string;
    statistics: Array<{
      value: string;
      context: string;
    }>;
    main_content: string;
  };
  speaker_points: Array<{
    name: string;
    role: string;
    party: string;
    contributions: Array<{
      type: string;
      content: string;
      references: string[];
    }>;
  }>;
  relevance: number;
}

interface SearchResultsProps {
  results: {
    Debates: Debate[];
    TotalDebates: number;
  };
  isLoading: boolean;
  totalResults: number;
  searchParams: SearchParams;
}

const constructHansardUrl = (debateExtId: string, title: string, date: string) => {
  const formattedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  return `https://hansard.parliament.uk/House/${date}/debates/${debateExtId}/${formattedTitle}`;
};

export function SearchResults({ results, isLoading, totalResults, searchParams }: SearchResultsProps) {
  const [selectedDebate, setSelectedDebate] = useState<Debate | null>(null);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (!results.Debates?.length) {
    return <EmptyState searchTerm={searchParams.searchTerm} />;
  }

  const renderSelectedDebate = () => {
    if (!selectedDebate) return null;

    return (
      <Card className={cn(
        "overflow-hidden relative w-full border-l-[6px] transition-colors h-[calc(100vh-12rem)] overflow-y-auto",
        "sticky top-6"
      )}
      style={{ 
        borderLeftColor: locationColors[selectedDebate.house] || '#2b2b2b',
        borderLeftStyle: 'solid',
        backgroundImage: `linear-gradient(to right, ${locationColors[selectedDebate.house]}15, transparent 10%)`,
      }}>
        <CardHeader className="sticky top-0 bg-card border-b z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(selectedDebate.date), 'dd MMM yyyy')}
              <Badge variant="secondary" className="text-xs">
                {selectedDebate.type}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => window.open(
                constructHansardUrl(
                  selectedDebate.ext_id,
                  selectedDebate.title,
                  selectedDebate.date
                ),
                '_blank'
              )}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Hansard</span>
            </Button>
          </div>
          <CardTitle className="text-xl">{selectedDebate.title}</CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          {selectedDebate.analysis && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-muted-foreground">
                <FormattedMarkdown content={selectedDebate.analysis.main_content} />
              </div>

              {selectedDebate.analysis.statistics?.length > 0 && (
                <div className="grid grid-cols-2 gap-4 my-6">
                  {selectedDebate.analysis.statistics.map((stat, i) => (
                    <div key={i} className="group p-6 bg-muted/5 rounded-lg border hover:border-primary/50 transition-colors">
                      <div className="font-bold text-primary text-lg mb-2">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">
                        <FormattedMarkdown content={stat.context} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDebate.analysis.outcome && (
                <div className="mt-6 p-4 bg-muted/5 rounded-lg border">
                  <h4 className="font-medium mb-2">Outcome</h4>
                  <div className="text-sm text-muted-foreground">
                    <FormattedMarkdown content={selectedDebate.analysis.outcome} />
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedDebate.speaker_points?.length > 0 && (
            <div className="mt-8 space-y-4">
              <h4 className="font-medium">Key Contributions</h4>
              <div className="space-y-4">
                {selectedDebate.speaker_points.map((speaker, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-32">
                      <div className="font-medium text-sm">{speaker.name}</div>
                      <div className="text-xs text-muted-foreground">{speaker.role}</div>
                      {speaker.party && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full text-white inline-block mt-1"
                          style={{ backgroundColor: partyColours[speaker.party]?.color || '#808080' }}
                        >
                          {speaker.party}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow bg-muted/5 rounded-lg p-4 border">
                      {speaker.contributions.map((contribution, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          <FormattedMarkdown content={contribution.content} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Found {results.TotalDebates} debates
        </h2>
        <div className="flex gap-2 text-sm text-muted-foreground">
          {searchParams.house && (
            <Badge variant="outline">House: {searchParams.house}</Badge>
          )}
          {searchParams.type && (
            <Badge variant="outline">Type: {searchParams.type}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-6">
        <div className="space-y-4">
          {results.Debates.map((debate) => (
            <Card 
              key={debate.ext_id}
              className={cn(
                "cursor-pointer overflow-hidden border-l-[6px] transition-colors",
                selectedDebate?.ext_id === debate.ext_id && "ring-2 ring-primary",
              )}
              style={{ 
                borderLeftColor: locationColors[debate.house] || '#2b2b2b',
                backgroundImage: `linear-gradient(to right, ${locationColors[debate.house]}08, transparent 15%)`,
              }}
              onClick={() => setSelectedDebate(debate)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(debate.date), 'dd MMM yyyy')}
                    <Badge variant="secondary" className="text-xs">
                      {debate.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        constructHansardUrl(
                          debate.ext_id,
                          debate.title,
                          debate.date
                        ),
                        '_blank'
                      );
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="text-lg font-medium mb-2">{debate.title}</h3>
                {debate.analysis?.main_content && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {debate.analysis.main_content}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div>
          {renderSelectedDebate()}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ searchTerm }: { searchTerm?: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        {searchTerm ? (
          <p className="text-muted-foreground">
            No results found for &quot;{searchTerm}&quot;
          </p>
        ) : (
          <p className="text-muted-foreground">
            Start typing to search debates...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchResults;