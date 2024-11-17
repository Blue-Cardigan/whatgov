import { format } from "date-fns";
import type { MPKeyPoint } from "@/lib/supabase";

interface MPKeyPointsProps {
  keyPoints: MPKeyPoint[];
}

export function MPKeyPoints({ keyPoints }: MPKeyPointsProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Recent Parliamentary Contributions</h3>
      <div className="space-y-4">
        {keyPoints.map((point, index) => (
          <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-start gap-4 mb-3">
              <span className="text-sm font-medium">
                {format(new Date(point.debate_date), 'EEEE, d MMMM yyyy')}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full ${
                point.point_type === 'made' ? 'bg-blue-100 text-blue-800' :
                point.point_type === 'supported' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {point.point_type === 'made' ? 'Made Point' :
                 point.point_type === 'supported' ? 'Supported' :
                 'Opposed'}
              </span>
            </div>
            <p className="text-sm mb-3 leading-relaxed">{point.point}</p>
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <p className="font-medium mb-1">Debate: {point.debate_title}</p>
              {point.original_speaker && (
                <p>Original Speaker: {point.original_speaker}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 