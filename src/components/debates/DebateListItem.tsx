import { Card, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DebateListItemProps {
  debate: {
    ExternalId: string;
    Title: string;
    ItemDate: string;
    Description?: string;
  };
  isSelected?: boolean;
  onClick: () => void;
}

export function DebateListItem({ debate, isSelected, onClick }: DebateListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
    >
      <Card className={cn(
        "transition-colors",
        isSelected ? "bg-gray-100" : "hover:bg-gray-50"
      )}>
        <CardHeader>
          <CardTitle>{debate.Title}</CardTitle>
          <CardDescription>
            <div>{formatDate(debate.ItemDate)}</div>
            {debate.Description && (
              <div className="mt-1">{debate.Description}</div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </button>
  );
} 