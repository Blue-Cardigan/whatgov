import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WeeklyContentSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="h-px bg-primary w-full mb-3" />
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4">
        {/* Left Column */}
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <Card className="border-l-[6px] border-l-muted p-4">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%] mt-2" />
              </Card>
            </div>
          ))}
        </div>

        {/* Center Column */}
        <Card className="col-span-1">
          <div className="p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-2 mb-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[90%]" />
            </div>
            <Card className="border-l-[6px] border-l-muted">
              <div className="px-6 py-4 border-b">
                <div className="flex justify-between">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[95%]" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[100px]" />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {[2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Card className="border-l-[6px] border-l-muted p-4">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%] mt-2" />
              </Card>
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* RSS Feeds Row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 