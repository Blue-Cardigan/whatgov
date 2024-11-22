'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Building2, Briefcase, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
import { useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { Suspense } from 'react';

const tiers = [
  {
    name: "Citizen",
    description: "For everyone - because democracy should be accessible",
    price: "Free",
    icon: Building2,
    features: [
      "Unlimited votes on key questions",
      "See MPs battle it out in the comments",
      "View basic MP profiles",
      "Parliamentary calendar and upcoming debates",
      "Basic debate search and filtering",
      "Personalised feed based on your interests",
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
      "Track what your MP says in Parliament",
      "View your voting analytics",
      "Filter your feed by day, type, and topic",
      "Advanced Hansard search capabilities",
      "See what's coming up in Parliament",
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
  const { user, getAuthHeader } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Show success/error messages based on URL params
    if (searchParams?.get('success')) {
      toast({
        title: "Subscription activated!",
        description: "Welcome to your enhanced parliamentary experience",
        variant: "default",
      });
    }
    if (searchParams?.get('canceled')) {
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
        description: "Please sign in to subscribe to a plan",
        variant: "destructive",
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

  return (
    <div className="space-y-8">
      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <Card 
            key={tier.name}
            className={cn(
              "relative flex flex-col",
              tier.popular && "border-primary shadow-lg scale-105"
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
              {tier.name === "Citizen" ? (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    if (user) {
                      router.push('/myparliament');
                    } else {
                      router.push('/signup');
                    }
                  }}
                >
                  {user ? "Get Started" : "Sign Up Free"}
                </Button>
              ) : tier.name === "Professional" ? (
                <Button 
                  className="w-full" 
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe(PLANS["ENGAGED_CITIZEN"].id)}
                >
                  Subscribe
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}

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