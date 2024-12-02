import { format } from "date-fns";
import type { MPKeyPoint } from "@/types";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface MPKeyPointsProps {
  keyPoints: MPKeyPoint[];
}

const getContributionSummary = (point: MPKeyPoint): { text: string; color: string } => {
  switch (point.point_type) {
    case 'made':
      return {
        text: `Made a point during debate`,
        color: 'bg-blue-100 text-blue-800'
      };
    case 'supported':
      return {
        text: point.original_speaker 
          ? `Agreed with ${point.original_speaker}'s point`
          : 'Supported this point',
        color: 'bg-emerald-100 text-emerald-800'
      };
    case 'opposed':
      return {
        text: point.original_speaker 
          ? `Disagreed with ${point.original_speaker}'s point`
          : 'Opposed this point',
        color: 'bg-rose-100 text-rose-800'
      };
    default:
      return {
        text: 'Contributed to debate',
        color: 'bg-gray-100 text-gray-800'
      };
  }
};

const groupPointsByMonth = (points: MPKeyPoint[]) => {
  return points.reduce((groups, point) => {
    const date = new Date(point.debate_date);
    const key = format(date, 'MMMM yyyy');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(point);
    return groups;
  }, {} as Record<string, MPKeyPoint[]>);
};

export function MPKeyPoints({ keyPoints }: MPKeyPointsProps) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  
  // Sort and group points
  const sortedPoints = [...keyPoints].sort(
    (a, b) => new Date(b.debate_date).getTime() - new Date(a.debate_date).getTime()
  );
  
  const years = Array.from(new Set(
    sortedPoints.map(point => format(new Date(point.debate_date), 'yyyy'))
  ));
  
  const filteredPoints = selectedYear
    ? sortedPoints.filter(point => format(new Date(point.debate_date), 'yyyy') === selectedYear)
    : sortedPoints;
    
  const groupedPoints = groupPointsByMonth(filteredPoints);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Parliamentary Timeline</h3>
        
        {/* Year filter */}
        <div className="flex gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year === selectedYear ? null : year)}
              className={`px-2 py-1 text-sm rounded ${
                year === selectedYear 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-muted" />

        <div className="space-y-8 relative">
          {Object.entries(groupedPoints).map(([month, points]) => (
            <div key={month} className="space-y-6">
              <h4 className="text-sm font-medium text-muted-foreground pl-10">{month}</h4>
              
              {points.map((point, index) => {
                const contribution = getContributionSummary(point);
                
                return (
                  <div key={`${point.ext_id}-${index}`} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2 w-3 h-3 rounded-full -translate-x-1/2 ${
                        point.point_type === 'made' ? 'bg-blue-500' :
                        point.point_type === 'supported' ? 'bg-emerald-500' :
                        point.point_type === 'opposed' ? 'bg-rose-500' :
                        'bg-gray-500'
                      } ring-4 ring-background`}
                    />

                    {/* Timeline content */}
                    <div className="space-y-3 bg-muted/5 rounded-lg p-4 hover:bg-muted/10 transition-colors">
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant="outline">
                          {format(new Date(point.debate_date), 'EEEE, d MMM yyyy')}
                        </Badge>
                        <Badge 
                          variant="secondary"
                          className={contribution.color}
                        >
                          {contribution.text}
                        </Badge>
                      </div>

                      {/* Main content */}
                      <p className="text-sm">{point.point}</p>

                      {/* Debate info */}
                      <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
                        <Link 
                          href={`/debate/${point.ext_id}`}
                          className="group flex items-start gap-1.5 font-medium hover:text-primary transition-colors"
                        >
                          {point.debate_title}
                          <ArrowUpRight className="h-4 w-4 opacity-50 shrink-0 group-hover:opacity-100" />
                        </Link>
                      </div>

                      {/* Topics */}
                      {point.ai_topics && point.ai_topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {point.ai_topics.flatMap(topic => 
                            topic.subtopics?.map((subtopic, i) => (
                              <Badge 
                                key={`${topic.name}-${i}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                {subtopic}
                              </Badge>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 