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
  const { isEngagedCitizen } = useAuth();

  const getContent = () => {
    if (feature === 'ai-search') {
      return isEngagedCitizen ? {
        title: "Upgrade to Pro",
        description: "Get unlimited AI searches and custom assistants",
        buttonText: "Upgrade to Pro"
      } : {
        title: "Upgrade Your Account",
        description: "Upgrade to an Engaged Citizen subscription to get 5 AI searches per week",
        buttonText: "Upgrade"
      };
    }

    return isEngagedCitizen ? {
      title: "Upgrade to Pro",
      description: "Create unlimited custom assistants",
      buttonText: "Upgrade to Pro"
    } : {
      title: "Upgrade Your Account",
      description: "Upgrade to an Engaged Citizen subscription to create a custom assistant",
      buttonText: "Upgrade"
    };
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
            <Link href={isEngagedCitizen ? "/pro" : "/verify"}>
              {content.buttonText}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 