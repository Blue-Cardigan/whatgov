'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export default function BillingPage() {
  const { user, subscription } = useAuth();

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to access billing portal');
      }
      
      const { url } = await response.json();
      if (!url) {
        throw new Error('No portal URL returned');
      }
      
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to access billing portal. Please try again.",
        variant: "destructive",
      });
      console.error('Billing portal error:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
        <CardDescription>Manage your subscription and billing details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Plan</div>
            <div className="font-medium">{subscription?.plan_type || 'Free'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium capitalize">{subscription?.status || 'inactive'}</div>
          </div>
          {subscription?.stripe_customer_id && (
            <Button onClick={handleManageSubscription}>
              Manage Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 