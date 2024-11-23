import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, MapPin, UserCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useMemo } from "react";
import { DemographicComparisonProps } from '@/types/VoteStats';
import { QuestionCard } from "./QuestionCard";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function DemographicComparison({
  userDemographics,
  constituencyStats,
  demographicComparison,
  constituencyBreakdown,
  isOverview = false,
  showUpgradePrompt = false
}: DemographicComparisonProps) {
  const [filterBy, setFilterBy] = useState<'constituency' | 'gender' | 'age'>('constituency');

  // Enhanced filter options with more metadata
  const FILTER_OPTIONS = [
    { 
      value: 'constituency', 
      label: 'Constituency', 
      icon: <MapPin className="h-4 w-4" />, 
      description: 'Compare with your local area',
      getText: () => `Questions popular in ${userDemographics?.constituency || 'your constituency'}`,
      emptyMessage: 'No constituency data available',
      badge: constituencyStats?.total_votes ? 
        `${constituencyStats.total_votes.toLocaleString()} votes` : undefined
    },
    { 
      value: 'gender', 
      label: 'Gender', 
      icon: <UserCircle2 className="h-4 w-4" />,
      description: 'See gender-based voting patterns',
      getText: () => `Questions popular among ${userDemographics?.gender || 'your gender'} voters`,
      emptyMessage: 'No gender data available',
      badge: demographicComparison?.gender ? 
        `${Object.keys(demographicComparison.gender).length} groups` : undefined
    },
    { 
      value: 'age', 
      label: 'Age Group', 
      icon: <Users className="h-4 w-4" />,
      description: 'Compare across age groups',
      getText: () => `Questions popular in the ${userDemographics?.age_group || 'your age'} group`,
      emptyMessage: 'No age group data available',
      badge: demographicComparison?.age_group ?
        `${Object.keys(demographicComparison.age_group).length} groups` : undefined
    },
  ] as const;

  // Memoized values
  const questions = useMemo(() => {
    // getFilteredQuestions logic moved inside
    const getFilteredQuestions = () => {
      if (filterBy === 'constituency') {
        if (!userDemographics?.constituency || !constituencyBreakdown) return [];
        return constituencyBreakdown[userDemographics.constituency]?.questions.map(q => ({
          ...q,
          topic: q.topic || 'Unknown'
        })) || [];
      }

      if (filterBy === 'gender') {
        if (!userDemographics?.gender || !demographicComparison?.gender) return [];
        return demographicComparison.gender[userDemographics.gender]?.questions || [];
      }

      if (filterBy === 'age') {
        if (!userDemographics?.age_group || !demographicComparison?.age_group) return [];
        return demographicComparison.age_group[userDemographics.age_group]?.questions || [];
      }

      return [];
    };

    return getFilteredQuestions()
      .sort((a, b) => b.total_votes - a.total_votes)
      .slice(0, 10);
  }, [
    filterBy,
    userDemographics,
    constituencyBreakdown,
    demographicComparison
  ]);

  const isLoading = useMemo(() => 
    !demographicComparison && !constituencyBreakdown && !constituencyStats,
    [demographicComparison, constituencyBreakdown, constituencyStats]
  );

  // Helper functions
  const calculatePercentage = (value: number | string, total: number): string => 
    ((Number(value) / total) * 100).toFixed(1);

  const formatAyePercentage = (percentage: number): number => 
    percentage <= 1 ? percentage * 100 : percentage;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-[200px]" />
          <div className="h-10 w-[220px]" />
        </div>
        
        <DashboardSkeleton />
        
        {!showUpgradePrompt && (
          <>
            {/* Gender Distribution Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-[140px]" />
              </div>
              <div className="grid gap-2">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[60px]" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Age Distribution Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-[160px]" />
              </div>
              <div className="grid gap-2">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-4 w-[60px]" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!demographicComparison && !constituencyBreakdown && !isOverview) {
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

  return (
    <div className="space-y-6">
      <Tabs value={filterBy} onValueChange={(value) => setFilterBy(value as typeof filterBy)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          {FILTER_OPTIONS.map(option => (
            <TabsTrigger 
              key={option.value} 
              value={option.value}
              className="relative"
            >
              <div className="flex items-center gap-2">
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {FILTER_OPTIONS.find(opt => opt.value === filterBy)?.getText()}
            </div>
            {!isOverview && (
              <Badge variant="outline" className="text-xs">
                {filterBy === 'constituency' ? constituencyStats?.total_votes.toLocaleString() :
                 filterBy === 'gender' ? totalGenderVotes.toLocaleString() :
                 totalAgeVotes.toLocaleString()} total votes
              </Badge>
            )}
          </div>
          
          <div className="grid gap-4">
            {questions.length > 0 ? (
              <div className="grid gap-4">
                {questions.map((question, idx) => (
                  <QuestionCard 
                    key={`${question.debate_id}-${idx}`}
                    question={question} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {FILTER_OPTIONS.find(opt => opt.value === filterBy)?.emptyMessage}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {!showUpgradePrompt && (
        <div className="grid gap-6 md:grid-cols-2">
          {demographicComparison?.gender && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserCircle2 className="h-4 w-4" />
                  Gender Distribution
                </div>
                <Badge variant="outline" className="text-xs">
                  {totalGenderVotes.toLocaleString()} votes
                </Badge>
              </div>
              <div className="grid gap-2">
                {Object.entries(demographicComparison.gender).map(([gender, stats]) => {
                  const displayPercentage = formatAyePercentage(Number(stats.aye_percentage));
                  const isUserGender = !isOverview && gender === userDemographics?.gender;

                  return (
                    <TooltipProvider key={gender}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card className={cn(
                            "p-4 transition-colors hover:bg-muted/50",
                            isUserGender && "border-primary"
                          )}>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{gender}</span>
                                <span className="font-medium">{Math.round(displayPercentage)}% Ayes</span>
                              </div>
                              <Progress value={displayPercentage} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                {calculatePercentage(stats.total_votes, totalGenderVotes)}% of total votes
                              </div>
                            </div>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{gender} Voters</p>
                            <p className="text-xs text-muted-foreground">
                              Based on {Number(stats.total_votes).toLocaleString()} votes
                            </p>
                          </div>
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
                    const displayPercentage = formatAyePercentage(ayePercentage);

                    return (
                      <TooltipProvider key={age}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Card className={`p-0 ${age === userDemographics?.age_group ? 'border-primary' : ''}`}>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>{age}</span>
                                  <span className="font-medium">{Math.round(displayPercentage)}% Ayes</span>
                                </div>
                                <Progress value={displayPercentage} className="h-2" />
                                <div className="text-xs text-muted-foreground">
                                  {calculatePercentage(stats.total_votes, totalAgeVotes)}% of total votes
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

          {!isOverview && userDemographics && (
            <div className="rounded-lg bg-muted p-4 mt-6">
              <h3 className="font-medium mb-2">Your Voting Analysis</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                {constituencyStats && (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      Math.abs(constituencyAyePercentage) > 5 
                        ? "bg-yellow-500" 
                        : "bg-green-500"
                    )} />
                    <p>
                      Your voting pattern {Math.abs(constituencyAyePercentage) > 5 
                        ? `differs by ${Math.round(Math.abs(constituencyAyePercentage))}% from` 
                        : `closely matches`
                      } your constituency average.
                    </p>
                  </div>
                )}
                {demographicComparison?.gender && userDemographics?.gender && (
                  <p>
                    You vote similarly to {Math.round(Number(demographicComparison.gender[userDemographics.gender]?.aye_percentage || 0))}% of 
                    voters in your gender group.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 