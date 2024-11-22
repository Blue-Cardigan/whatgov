import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, MapPin, UserCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DemographicComparisonProps {
  userDemographics?: {
    constituency?: string;
    gender?: string;
    age_group?: string;
  };
  constituencyStats?: {
    total_votes: number;
    aye_votes: number;
    no_votes: number;
  };
  demographicComparison?: {
    gender?: Record<string, {
      total_votes: number | string;
      aye_percentage: number | string;
    }>;
    age_group?: Record<string, {
      total_votes: number | string;
      aye_percentage: number | string;
    }>;
  };
  constituencyBreakdown?: Record<string, {
    total_votes: number | string;
    aye_votes: number | string;
    no_votes: number | string;
  }>;
  isOverview?: boolean;
}

export function DemographicComparison({
  userDemographics,
  constituencyStats,
  demographicComparison,
  constituencyBreakdown,
  isOverview = false
}: DemographicComparisonProps) {
  if (!demographicComparison && !isOverview) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No demographic data available
      </div>
    );
  }

  const constituencyAyePercentage = constituencyStats 
    ? (constituencyStats.aye_votes / constituencyStats.total_votes) * 100 
    : 0;

  const getTotalVotes = (data?: Record<string, { total_votes: string | number }>) =>
    Object.values(data || {}).reduce((sum, { total_votes }) => sum + Number(total_votes), 0);

  const totalGenderVotes = getTotalVotes(demographicComparison?.gender);
  const totalAgeVotes = getTotalVotes(demographicComparison?.age_group);

  const calculateAyePercentage = (aye_votes: number | string, total_votes: number | string) => {
    const ayes = Number(aye_votes);
    const total = Number(total_votes);
    return total > 0 ? (ayes / total) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {(isOverview || (userDemographics?.constituency && constituencyStats)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            {isOverview ? "Constituency Breakdown" : userDemographics?.constituency}
          </div>
          <Card className="p-4">
            <div className="space-y-2">
              {isOverview ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Total votes across all constituencies: {
                      Object.values(constituencyBreakdown || {})
                        .reduce((sum, stats) => sum + Number(stats.total_votes), 0)
                        .toLocaleString()
                    }
                  </div>
                  <div className="grid gap-2">
                    {Object.entries(constituencyBreakdown || {})
                      .sort((a, b) => Number(b[1].total_votes) - Number(a[1].total_votes))
                      .slice(0, 5)
                      .map(([constituency, stats]) => {
                        const ayePercentage = calculateAyePercentage(stats.aye_votes, stats.total_votes);
                        return (
                          <div key={constituency} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{constituency}</span>
                              <span className="font-medium">{Math.round(ayePercentage)}% Ayes</span>
                            </div>
                            <Progress value={ayePercentage} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {Number(stats.total_votes).toLocaleString()} votes
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Your Constituency Average</span>
                    <span className="font-medium">{Math.round(constituencyAyePercentage)}% Ayes</span>
                  </div>
                  <Progress value={constituencyAyePercentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Based on {constituencyStats?.total_votes.toLocaleString()} votes
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {demographicComparison?.gender && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserCircle2 className="h-4 w-4" />
            Gender Distribution
          </div>
          <div className="grid gap-2">
            {Object.entries(demographicComparison.gender).map(([gender, stats]) => {
              
              const ayePercentage = Number(stats.aye_percentage);
              const displayPercentage = ayePercentage <= 1 ? ayePercentage * 100 : ayePercentage;

              return (
                <TooltipProvider key={gender}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className={`p-4 ${!isOverview && gender === userDemographics?.gender ? 'border-primary' : ''}`}>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{gender}</span>
                            <span className="font-medium">{Math.round(displayPercentage)}% Ayes</span>
                          </div>
                          <Progress value={displayPercentage} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {((Number(stats.total_votes) / totalGenderVotes) * 100).toFixed(1)}% of total votes
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Based on {Number(stats.total_votes).toLocaleString()} votes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      )}

      {demographicComparison?.age_group && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Age Group Distribution
          </div>
          <div className="grid gap-2">
            {Object.entries(demographicComparison.age_group)
              .sort((a, b) => {
                const ageA = parseInt(a[0]);
                const ageB = parseInt(b[0]);
                return ageA - ageB;
              })
              .map(([age, stats]) => {
                const ayePercentage = Number(stats.aye_percentage);
                const displayPercentage = ayePercentage <= 1 ? ayePercentage * 100 : ayePercentage;

                return (
                  <TooltipProvider key={age}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className={`p-4 ${age === userDemographics?.age_group ? 'border-primary' : ''}`}>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{age}</span>
                              <span className="font-medium">{Math.round(displayPercentage)}% Ayes</span>
                            </div>
                            <Progress value={displayPercentage} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {((Number(stats.total_votes) / totalAgeVotes) * 100).toFixed(1)}% of total votes
                            </div>
                          </div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Based on {Number(stats.total_votes).toLocaleString()} votes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
          </div>
        </div>
      )}

      {!isOverview && (
        <div className="text-sm text-muted-foreground space-y-2">
          {constituencyStats && (
            <p>
              Your voting pattern {Math.abs(constituencyAyePercentage) > 5 ? 
                `differs significantly from` : 
                `aligns closely with`
              } your constituency average.
            </p>
          )}
          {demographicComparison?.gender && userDemographics?.gender && (
            <p>
              You vote similarly to {Math.round(Number(demographicComparison.gender[userDemographics.gender]?.aye_percentage || 0))}% of 
              voters in your gender group.
            </p>
          )}
        </div>
      )}
    </div>
  );
} 