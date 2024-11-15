'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { PLANS, PlanType } from '@/lib/stripe-client';
import { Check, CreditCard } from 'lucide-react';

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

  const currentPlan = subscription?.plan_type ? PLANS[subscription.plan_type as PlanType] : null;

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>Your current plan and billing details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Current Plan</div>
                <div className="font-medium">{currentPlan?.name || 'Free'}</div>
              </div>
              {currentPlan && (
                <div className="text-lg font-bold">
                  £{currentPlan.price}/month
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium capitalize flex items-center gap-2">
                <span className={subscription?.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                  {subscription?.status || 'inactive'}
                </span>
              </div>
            </div>
            {subscription?.stripe_customer_id && (
              <Button 
                onClick={handleManageSubscription}
                className="w-full sm:w-auto"
                variant="outline"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans Card */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that works best for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {Object.entries(PLANS).map(([key, plan]) => (
              <Card key={key} className={`relative ${
                subscription?.plan_type === key ? 'border-2 border-primary' : ''
              }`}>
                {subscription?.plan_type === key && (
                  <div className="absolute -top-3 -right-3">
                    <div className="bg-primary text-primary-foreground p-1 rounded-full">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>£{plan.price}/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {key === 'ENGAGED_CITIZEN' ? (
                      <>
                        <li>✓ Vote on debates</li>
                        <li>✓ Basic analytics</li>
                        <li>✓ Email notifications</li>
                      </>
                    ) : (
                      <>
                        <li>✓ All Engaged Citizen features</li>
                        <li>✓ Advanced analytics</li>
                        <li>✓ Priority notifications</li>
                        <li>✓ Custom reports</li>
                      </>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 