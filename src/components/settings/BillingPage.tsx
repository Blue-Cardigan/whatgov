'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { PLANS, PlanType } from '@/lib/stripe-client';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface BillingPageProps {
  className?: string;
}

export default function BillingPage({ className }: BillingPageProps) {
  const { user, subscription, getAuthHeader } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const authHeader = await getAuthHeader();
      
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authHeader}`,
        },
        credentials: 'include',
      });
      
      if (response.status === 401) {
        throw new Error('Please sign in to access billing');
      }
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to access billing portal');
      }
      
      const { url } = await response.json();
      if (!url) {
        throw new Error('No portal URL returned');
      }
      
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to access billing portal",
        variant: "destructive",
      });
      console.error('Billing portal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will end at the current billing period.",
      });
      
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to cancel subscription. Please try again.",
        variant: "destructive",
      });
      console.error('Cancel subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const currentPlan = subscription?.plan ? PLANS[subscription.plan as PlanType] : null;

  return (
    <div className={`space-y-6 ${className}`}>
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
                <span 
                  className={
                    subscription?.status === 'active' 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }
                >
                  {subscription?.status || 'inactive'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {subscription?.stripe_customer_id && (
                <Button 
                  onClick={handleManageSubscription}
                  className="w-full sm:w-auto"
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Manage Billing
                </Button>
              )}

              {subscription?.stripe_customer_id && subscription.status === 'active' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        'Cancel Subscription'
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your subscription will remain active until the end of your current billing period. 
                        After that, you&apos;ll lose access to premium features.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCancelSubscription}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans Card */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that works best for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {Object.entries(PLANS).map(([key, plan]) => (
              <Card 
                key={key} 
                className={`relative ${
                  subscription?.plan === key ? 'border-2 border-primary' : ''
                }`}
              >
                {subscription?.plan === key && (
                  <div className="absolute -top-3 -right-3">
                    <div className="bg-primary text-primary-foreground p-1 rounded-full">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    £{plan.price}/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {renderPlanFeatures(key as PlanType)}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}