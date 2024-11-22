import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import type { TopicStats } from "@/types/VoteStats";
import { calculateEngagementScore, calculateAgreementRate, calculateConsistencyScore } from "./utils/scoring";

interface TopicWithName extends TopicStats {
  name: string;
}

export const TopicComparison = ({ topics }: { topics: TopicWithName[] }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Topic Comparison</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {topics.map(topic => {
        const chartData = [
          { metric: 'Engagement', value: calculateEngagementScore(topic) },
          { metric: 'Agreement', value: calculateAgreementRate(topic) },
          { metric: 'Consistency', value: calculateConsistencyScore(topic) },
        ];

        return (
          <div key={topic.name} className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">{topic.name}</div>
              <div className="text-sm text-muted-foreground">
                {topic.total_votes} votes
              </div>
            </div>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart 
                  cx="50%" 
                  cy="50%" 
                  outerRadius="80%" 
                  data={chartData}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name={topic.name}
                    dataKey="value"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  </div>
); 