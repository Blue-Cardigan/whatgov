import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

interface SubscriptionCTAProps {
  title: string;
  description: string;
  features: string[];
  className?: string;
}

export function SubscriptionCTA({
  title,
  description,
  features,
  className = "",
}: SubscriptionCTAProps) {
  return (
    <Card className={`p-6 bg-muted/50 ${className}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button asChild className="w-full">
          <Link href="/pricing">
            Upgrade Now
          </Link>
        </Button>
      </div>
    </Card>
  );
} 