import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, InfoIcon, UserIcon } from 'lucide-react';
import { useMemo } from 'react';
import { FormattedMarkdown } from '@/lib/utils';

interface AnalysisDataPoint {
  value: string;
  context: string;
}

interface KeyDate {
  date: string;
  significance: string;
}

interface KeyStatistic {
  value: string;
  context: string;
}

export interface ParsedAnalysisData {
  main_content?: string;
  outcome?: string;
  policy_terms?: string[];
  dates?: string[] | KeyDate[];
  data?: AnalysisDataPoint[];
  key_statistics?: KeyStatistic[];
}

export interface SpeakerPoint {
  name: string;
  role: string;
  party: string;
  constituency: string;
  contributions: Array<{
    type: string;
    content: string;
    references: Array<{
      value: string;
      source?: string;
    }>;
  }>;
}

interface AnalysisDataProps {
  data: string | ParsedAnalysisData;
  speakerPoints: SpeakerPoint[];
}

export function AnalysisData({ data, speakerPoints }: AnalysisDataProps) {
  const parsedData = useMemo(() => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as ParsedAnalysisData;
      } catch (e) {
        console.error('Failed to parse analysis data:', e);
        return {
          main_content: data,
          policy_terms: [],
          dates: [],
          data: []
        };
      }
    }
    return data;
  }, [data]);

  if (!parsedData || typeof parsedData !== 'object') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <FormattedMarkdown content={typeof data === 'string' ? data : 'No analysis available'} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <FormattedMarkdown content={parsedData.main_content || ''} />
          </div>
        </CardContent>
      </Card>

      {/* Speaker Points */}
      {speakerPoints?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {speakerPoints.map((point, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/5">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{point.name}</h4>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {point.party}
                      </Badge>
                      {point.constituency && (
                        <Badge variant="outline" className="text-xs">
                          {point.constituency}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                {point.contributions.map((contribution, cIndex) => (
                  <div key={cIndex} className="text-sm space-y-2 mb-3 last:mb-0">
                    {contribution.type && (
                      <Badge variant="secondary" className="mb-2">
                        {contribution.type}
                      </Badge>
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <FormattedMarkdown content={contribution.content} />
                    </div>
                    {contribution.references?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {contribution.references.map((ref, rIndex) => (
                          <Badge 
                            key={rIndex}
                            variant="secondary"
                            className="text-xs"
                          >
                            {ref.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Key Statistics - Updated to handle both formats */}
      {(parsedData.data?.length || 0 > 0 || parsedData.key_statistics?.length || 0 > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(parsedData.key_statistics || parsedData.data)?.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="absolute top-0 right-0 p-2">
                  <InfoIcon className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <FormattedMarkdown content={stat.context} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Policy Terms and Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {parsedData.policy_terms?.length || 0 > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-3">Related Policies</h3>
              <div className="flex flex-wrap gap-2">
                {parsedData.policy_terms?.map((term, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="text-xs"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {parsedData.dates?.length || 0 > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-3">Key Dates</h3>
              <div className="space-y-2">
                {(parsedData.dates || []).map((date, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CalendarIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">
                        {typeof date === 'string' ? date : date.date}
                      </span>
                      {typeof date !== 'string' && date.significance && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {date.significance}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 