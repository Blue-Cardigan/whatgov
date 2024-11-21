import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    isDisabled?: boolean;
    badge?: string;
  };
  isActive: boolean;
  onSelect: () => void;
}

export function MenuItem({ item, isActive, onSelect }: MenuItemProps) {
  return (
    <Card
      className={cn(
        "group border transition-all duration-200 h-full",
        "hover:shadow-md",
        !item.isDisabled && "cursor-pointer",
        isActive && "ring-2 ring-primary ring-offset-2",
        item.isPremium && "bg-gradient-to-br from-primary/5 to-primary/10",
        item.isDisabled && "opacity-75"
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
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "text-sm font-semibold transition-colors duration-200 line-clamp-1",
                !item.isDisabled && `group-hover:${item.color}`
              )}>
                {item.title}
              </h3>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
              {item.description}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}