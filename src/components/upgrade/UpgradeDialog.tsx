import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Crown, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PLANS } from '@/lib/stripe-client';
import { toast } from "@/hooks/use-toast";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  features?: string[];
}

export function UpgradeDialog({ 
  open, 
  onOpenChange,
  title = "Upgrade to Engaged Citizen",
  description = "Access advanced features with an Engaged Citizen subscription.",
  features = [
    "Filter debates by speaker, type, and topic",
    "See key points made by MPs (+ comments section)",
    "Advanced Hansard search capabilities",
    "Track your MP's votes and speeches",
    "Access the upcoming Parliamentary schedule",
    "See how others voted on key issues",
    "Access your voting analytics",
  ]
}: UpgradeDialogProps) {
  const { user, getAuthHeader } = useAuth();
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Sign in to upgrade",
        description: "Please sign in to upgrade to a plan",
        variant: "default",
      });
      router.push('/login');
      return;
    }

    try {
      const token = await getAuthHeader();
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': `${user.id}-${Date.now()}`,
        },
        body: JSON.stringify({ priceId: PLANS["ENGAGED_CITIZEN"].id }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { url, sessionId } = await response.json();
      if (!url) throw new Error('No checkout URL received');
      
      localStorage.setItem('checkoutSessionId', sessionId);
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[500px] lg:max-w-[600px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
          {title}
        </DialogTitle>
        
        <DialogDescription asChild>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-sm sm:text-base text-muted-foreground">{description}</p>

            <Card className="w-full">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={cn(
                    "p-1.5 sm:p-2 rounded-lg",
                    "bg-purple-50 dark:bg-purple-500/10",
                    "text-purple-500"
                  )}>
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Engaged Citizen</CardTitle>
                    <CardDescription className="text-sm">For engaged citizens who want deeper insights</CardDescription>
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl sm:text-3xl font-bold">£2.49</span>
                  <span className="text-sm sm:text-base text-muted-foreground ml-2">/month</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 sm:space-y-3">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button 
                  className="w-full text-sm sm:text-base py-2 sm:py-3" 
                  onClick={handleSubscribe}
                >
                  Upgrade Now
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-sm sm:text-base"
                  onClick={() => onOpenChange(false)}
                >
                  Maybe Later
                </Button>
              </CardFooter>
            </Card>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
} 