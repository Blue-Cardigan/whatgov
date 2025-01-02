import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  showNextWeek: boolean;
  onToggleWeek: () => void;
}

export function EmptyState({ showNextWeek, onToggleWeek }: EmptyStateProps) {
  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">
            No Questions Scheduled
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {showNextWeek ? (
              <>
                There are no oral questions scheduled for next week yet. Check back later or view this week&apos;s questions.
              </>
            ) : (
              <>
                There are no more oral questions scheduled for this week. Try checking next week&apos;s schedule.
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleWeek}
          className="flex items-center gap-2"
        >
          {showNextWeek ? (
            <>
              <ChevronLeft className="h-4 w-4" />
              View This Week
            </>
          ) : (
            <>
              View Next Week
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
} 