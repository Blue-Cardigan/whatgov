import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface UpgradePopoverProps {
  children: React.ReactNode;
  feature: 'ai-search' | 'assistant';
  trigger?: 'hover' | 'click';
}

export function UpgradePopover({ children, feature }: UpgradePopoverProps) {
  const { isProfessional } = useAuth();

  const getContent = () => {
    if (feature === 'ai-search') {
      return {
        title: "Upgrade to Pro",
        description: "Get unlimited AI searches and subscribe to custom searches",
        buttonText: "Upgrade to Pro"
      }
    } else {
      return {
        title: "Upgrade to Pro",
        description: "See features of Pro",
        buttonText: "See Features"
      };
    }
  };

  const content = getContent();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{content.title}</h4>
            <p className="text-sm text-muted-foreground">
              {content.description}
            </p>
          </div>
          <Button asChild>
            <Link href={isProfessional ? "/pro" : "/verify"}>
              {content.buttonText}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 