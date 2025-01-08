import { Card } from "@/components/ui/card";

export function WeekSkeleton() {
  return (
    <Card className="overflow-hidden border-gray-200 rounded-xl shadow-sm">
      <div className="grid grid-cols-5 h-full animate-pulse">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="border-r last:border-r-0 p-4">
            <div className="h-6 w-20 bg-muted rounded-full mb-4" />
            {[...Array(7)].map((_, eventIndex) => (
              <div 
                key={eventIndex} 
                className="mb-3 p-3 border border-muted rounded-lg"
              >
                <div className="h-4 w-full bg-muted rounded-full mb-2" />
                <div className="h-3 w-2/3 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
} 