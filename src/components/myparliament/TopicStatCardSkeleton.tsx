export function TopicStatCardSkeleton() {
  return (
    <div className="space-y-4 p-4 rounded-lg border border-border animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-full bg-muted rounded-full" />
          <div className="flex justify-between">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
} 