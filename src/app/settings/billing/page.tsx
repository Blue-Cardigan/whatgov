'use client';

import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export default function BillingPage() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('plan_type, status, stripe_customer_id')
        .eq('user_id', user?.id || '')
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch {
      toast({
        title: "Error",
        description: "Unable to access billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
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