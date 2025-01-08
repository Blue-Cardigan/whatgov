import { Card } from "@/components/ui/card";

export function MonthSkeleton() {
  return (
    <Card className="overflow-hidden border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-5 border-b border-gray-200">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
          <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="animate-pulse">
        {[...Array(5)].map((_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-5 border-b border-gray-200 last:border-0">
            {[...Array(5)].map((_, dayIndex) => (
              <div key={dayIndex} className="min-h-[120px] p-2">
                <div className="h-6 w-6 bg-muted rounded-full mb-2" />
                <div className="space-y-2">
                  <div className="h-3 w-2/3 bg-muted rounded-full" />
                  <div className="h-3 w-1/2 bg-muted rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

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