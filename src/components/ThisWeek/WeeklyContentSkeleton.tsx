import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WeeklyContentSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Enhanced skeleton header */}
      <div className="mb-12">
        <Skeleton className="h-12 w-96 mx-auto bg-gradient-to-r from-muted to-muted/80" />
        <Skeleton className="h-6 w-48 mx-auto mt-2 bg-gradient-to-r from-muted/80 to-muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          {/* Weekly Summary Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-8 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
            </CardContent>
          </Card>

          {/* Key Debates Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-7 w-[80%]" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[90%]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          {/* Trending Terms Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-7 w-40" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Questions Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-7 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[90%]" />
                    {i < 3 && <Skeleton className="h-px w-full mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 