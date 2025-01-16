import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { PLANS } from '@/lib/stripe-client';
import createClient from '@/lib/supabase/client';

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
  const { user } = useAuth();
  const router = useRouter();

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upgrade to a plan",
        variant: "default",
      });
      router.push('/login');
      return;
    }

    try {
      // Get the current session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Idempotency-Key': `${user.id}-${Date.now()}`,
        },
        body: JSON.stringify({ priceId: PLANS["PROFESSIONAL"].id }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { url, sessionId } = await response.json();
      if (!url) throw new Error('No checkout URL received');
      
      // Store the session ID
      localStorage.setItem('checkoutSessionId', sessionId);
      
      // Redirect to checkout
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

        <Button onClick={handleUpgrade} className="w-full">
          Upgrade Now
        </Button>
      </div>
    </Card>
  );
} 