'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Building2, Briefcase, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PLANS } from '@/lib/stripe-client';
import { useEffect, useRef } from 'react';
import { Suspense } from 'react';
import createClient from '@/lib/supabase/client';

const tiers = [
  {
    name: "Citizen",
    description: "For everyone - because democracy should be accessible",
    price: "Free",
    icon: Building2,
    features: [
      "Unlimited votes across all parliamentary debates",
      "See MPs battle it out in the comments",
      "View your MP's profile",
      "View your constituency's voting record",
      "See upcoming questions being asked to Parliament",
      "Basic debate search and filtering",
    ],
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    popular: false,
  },
  {
    name: "Engaged Citizen",
    description: "For people who want deeper insights",
    price: "£2.49",
    icon: Crown,
    features: [
      "See how MPs voted in Parliamentary Divisions",
      "Filter your feed by House, day, session type, and topics covered",
      "See key points made by MPs (as well as the comments section)",
      "Track what your MP talks about in debates",
      "Access advanced voting analytics",
      "Advanced Hansard search capabilities",
    ],
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    popular: true,
  },
  {
    name: "Professional",
    description: "Advanced research and analysis tools for policy professionals",
    price: "Coming Soon",
    icon: Briefcase,
    features: [
      "Everything in Engaged Citizen, plus:",
      "AI research assistant with Hansard-wide analysis",
      "Sophisticated Hansard search",
      "Track bills and their progress",
      "Feed subscriptions for your site",
      "Data export in multiple formats",
      "Basic API access",
      "View constituency-wide trends",
      "Access parliamentary documents",
    ],
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    popular: false,
  },
];

// Create a separate component for the search params logic
function PricingContent() {
  const { user, refreshSubscription, isEngagedCitizen } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHandledSuccess = useRef(false);
  
  useEffect(() => {
    const handleSubscriptionSuccess = async () => {
      if (searchParams?.get('success') && user && !hasHandledSuccess.current) {
        hasHandledSuccess.current = true;
        
        // Clean up URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url.toString());
        
        // Then refresh subscription and show toast
        await refreshSubscription();
        toast({
          title: "Subscription activated!",
          description: "Welcome to your enhanced parliamentary experience",
          variant: "default",
        });
      }
    };

    handleSubscriptionSuccess();
  }, [searchParams, user, refreshSubscription]);

  useEffect(() => {
    if (searchParams?.get('canceled') && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
      
      toast({
        description: "Subscription canceled. Let us know if you have any questions.",
        variant: "default",
      });
    }
  }, [searchParams]);

  const handleSubscribe = async (priceId: string) => {
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
      // Get the current session instead of just the auth header
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
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { url, sessionId } = await response.json();
      if (!url) throw new Error('No checkout URL received');
      
      // Store the session ID if needed
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

  const getButtonConfig = (tierName: string) => {
    if (tierName === "Citizen") {
      return {
        variant: "outline" as const,
        onClick: () => {
          if (user) {
            router.push('/myparliament');
          } else {
            router.push('/signup');
          }
        },
        text: user ? "Get Started" : "Sign Up Free"
      };
    }

    if (tierName === "Professional") {
      return {
        variant: "outline" as const,
        disabled: true,
        text: "Coming Soon"
      };
    }

    // Engaged Citizen tier
    if (isEngagedCitizen) {
      return {
        variant: "outline" as const,
        onClick: () => router.push('/settings'),
        text: "Manage Subscription"
      };
    }

    return {
      variant: "default" as const,
      onClick: () => handleSubscribe(PLANS["ENGAGED_CITIZEN"].id),
      text: "Subscribe"
    };
  };

  return (
    <div className="space-y-8">
      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const buttonConfig = getButtonConfig(tier.name);
          
          return (
            <Card 
              key={tier.name}
              className={cn(
                "relative flex flex-col",
                tier.popular && "border-primary shadow-lg scale-105",
                isEngagedCitizen && tier.name === "Engaged Citizen" && "border-green-500"
              )}
            >
              {tier.popular && (
                <Badge 
                  className="absolute -top-2 right-4"
                  variant="default"
                >
                  Most Popular
                </Badge>
              )}
              {isEngagedCitizen && tier.name === "Engaged Citizen" && (
                <Badge 
                  className="absolute -top-2 right-4"
                  variant="success"
                >
                  Current Plan
                </Badge>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    tier.bgColor,
                    tier.color
                  )}>
                    <tier.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.price !== "Free" && (
                    <span className="text-muted-foreground ml-2">/month</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                <Button 
                  className="w-full" 
                  variant={buttonConfig.variant}
                  onClick={buttonConfig.onClick}
                  disabled={buttonConfig.disabled}
                >
                  {buttonConfig.text}
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {/* Enterprise Tier */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>Custom solutions for organisations</CardDescription>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Contact Sales</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enterprise Inquiry</DialogTitle>
                    <DialogDescription>
                      Please email enterprise@whatgov.co.uk for custom pricing and features.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                "Everything in Professional, plus:",
                "Custom cards for your website",
                "Constituency-level analysis",
                "Custom feature development",
                "Advanced API access",
                "Usage analytics",
                "Custom report generation",
                "Bulk data export",
                "Priority support",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        {/* Add FAQ component here */}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export function PricingTiers() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        {/* You can add a loading skeleton here if desired */}
        <div>Loading...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
} 