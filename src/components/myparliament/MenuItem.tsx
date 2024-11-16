import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  item: {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    isPremium: boolean;
  };
  isActive: boolean;
  onSelect: () => void;
}

export function MenuItem({ item, isActive, onSelect }: MenuItemProps) {
  return (
    <Card
      className={cn(
        "group border transition-all duration-200 h-full",
        "hover:shadow-md cursor-pointer",
        isActive && "ring-2 ring-primary ring-offset-2",
        item.isPremium && "bg-gradient-to-br from-primary/5 to-primary/10"
      )}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex flex-row items-start gap-4">
          <div
            className={cn(
              "p-2.5 rounded-xl transition-colors duration-200 shrink-0",
              item.bgColor,
              item.color
            )}
          >
            {item.icon}
          </div>
          <div className="space-y-1">
            <h3 className={cn(
              "text-sm font-semibold transition-colors duration-200 line-clamp-1",
              `group-hover:${item.color}`
            )}>
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
              {item.description}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}