import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-8">
        {/* Header Area */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Chart/Stats Area */}
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

export function QuestionsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card className="p-2">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-[120px]" />
          </div>
          <Skeleton className="h-9 w-[160px]" />
        </div>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function UpcomingDebatesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-[200px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>

      {/* Debate Cards */}
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="bg-muted px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-[120px]" />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  {[...Array(3)].map((_, k) => (
                    <Skeleton key={k} className="h-8 w-[120px] rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
} 