import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function DebateSkeleton() {
  return (
    <Card className="border-x-0 border-t-0 border-b border-border/50 dark:border-border/30 rounded-none animate-pulse">
      <CardHeader>
        {/* Header metadata */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-24 bg-muted rounded-full" />
          <div className="h-4 w-4 bg-muted rounded-full" />
          <div className="h-4 w-24 bg-muted rounded-full" />
        </div>
        
        {/* Title */}
        <div className="h-6 w-3/4 bg-muted rounded-full mb-6" />
        
        {/* Question 1 */}
        <div className="space-y-3 p-4 rounded-lg border-2 border-muted">
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 bg-muted rounded-full" />
            <div className="h-4 w-16 bg-muted rounded-full" />
          </div>
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-3 bg-muted rounded-full" />
          <div className="flex justify-between">
            <div className="h-4 w-20 bg-muted rounded-full" />
            <div className="h-4 w-20 bg-muted rounded-full" />
          </div>
          <div className="flex gap-3">
            <div className="h-8 flex-1 bg-muted rounded-md" />
            <div className="h-8 flex-1 bg-muted rounded-md" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-4 w-5/6 bg-muted rounded-full" />
        </div>

        {/* Question 2 */}
        <div className="space-y-3 p-4 rounded-lg border-2 border-muted">
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-3 bg-muted rounded-full" />
          <div className="flex gap-3">
            <div className="h-8 flex-1 bg-muted rounded-md" />
            <div className="h-8 flex-1 bg-muted rounded-md" />
          </div>
        </div>

        {/* Party participation */}
        <div className="space-y-2">
          <div className="h-4 w-40 bg-muted rounded-full" />
          <div className="h-4 bg-muted rounded-full" />
        </div>

        {/* Question 3 */}
        <div className="space-y-3 p-4 rounded-lg border-2 border-muted">
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-3 bg-muted rounded-full" />
          <div className="flex gap-3">
            <div className="h-8 flex-1 bg-muted rounded-md" />
            <div className="h-8 flex-1 bg-muted rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 