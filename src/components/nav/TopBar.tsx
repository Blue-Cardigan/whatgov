"use client";

import { cn, DAYS, DEBATE_TYPES, TOPICS, locationColors } from "@/lib/utils";
import type { ArrayFilterItem, BooleanFilterItem, FeedFilters } from "@/types";
import { DebateFilters } from "../debates/DebateFilters";
import { 
  Calendar, 
  MapPin, 
  Tags, 
  LayoutList,
  Lock,
  Crown,
  UserIcon,
  Vote,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { PLANS } from '@/lib/stripe-client';
import { toast } from "@/hooks/use-toast";
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface TopBarProps {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  className?: string;
}

// Enhanced filter items with access level information
export const filterItems = [
  {
    id: 'topics' as const,
    icon: Tags,
    label: "Topics",
    tier: 'premium' as const,
    description: "Filter debates by topic areas",
    type: 'array' as const,
    options: TOPICS.map(topic => ({
      value: topic.id,
      label: topic.label,
      icon: topic.icon
    }))
  },
  {
    id: 'days' as const,
    icon: Calendar,
    label: "Days",
    tier: 'premium' as const,
    description: "Filter by days of the week",
    type: 'array' as const,
    options: DAYS.map(day => ({
      value: day,
      label: day,
      icon: Calendar
    }))
  },
  {
    id: 'type' as const,
    icon: LayoutList,
    label: "Type",
    tier: 'premium' as const,
    description: "Filter by debate type",
    type: 'array' as const,
    options: [...DEBATE_TYPES.Commons, ...DEBATE_TYPES.Lords].map(({ type, label }) => ({
      value: type,
      label,
      icon: LayoutList
    }))
  },
  {
    id: 'location' as const,
    icon: MapPin,
    label: "Location",
    tier: 'premium' as const,
    description: "Filter by parliamentary location",
    type: 'array' as const,
    options: Object.entries(locationColors).map(([location, color]) => ({
      value: location,
      label: location,
      color: color as string,
      icon: MapPin
    }))
  }
] satisfies ArrayFilterItem[];

// Add boolean filters separately
export const booleanFilters = [
  {
    id: 'mpOnly' as const,
    icon: UserIcon,
    label: "My MP",
    tier: 'basic' as const,
    description: "Show only my MP's contributions",
    type: 'boolean' as const
  },
  {
    id: 'divisionsOnly' as const,
    icon: Vote,
    label: "Divisions",
    tier: 'premium' as const,
    description: "Show only division votes",
    type: 'boolean' as const
  }
] satisfies BooleanFilterItem[];

export function TopBar({ filters, onChange, className }: TopBarProps) {
  const { isEngagedCitizen, user, profile, getAuthHeader } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const router = useRouter();
  const supabase = useSupabase();

  const handleFilterChange = (updatedFilters: Omit<FeedFilters, 'house'>) => {
    // If user is not authenticated or doesn't have an MP, ignore mpOnly filter
    if (!user || !profile?.mp_id) {
      const { mpOnly, ...rest } = updatedFilters;
      onChange({
        ...filters,
        ...rest,
        mpOnly: false
      });
      return;
    }

    // If user is not subscribed, ignore all other filters except mpOnly
    if (!isEngagedCitizen) {
      const { mpOnly } = updatedFilters;
      onChange({
        ...filters,
        mpOnly,
        divisionsOnly: false,
        type: [],
        location: [],
        days: [],
        topics: []
      });
      return;
    }

    // Otherwise apply all filters
    onChange({
      ...filters,
      ...updatedFilters
    });
  };

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
    <>
      <div className={cn(
        "w-full",
        "md:fixed md:right-8 md:w-14 md:top-0 md:h-auto",
        className
      )}>
        <DebateFilters 
          filters={omitHouse(filters)}
          onChange={handleFilterChange} 
          filterItems={[...filterItems, ...booleanFilters]}
          isEnabled={isEngagedCitizen}
        />
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle className="text-2xl font-semibold mb-4">
            Upgrade to Engaged Citizen
          </DialogTitle>
          
          <DialogDescription asChild>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Access all advanced filtering options with an Engaged Citizen subscription.
              </p>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      "bg-purple-50 dark:bg-purple-500/10",
                      "text-purple-500"
                    )}>
                      <Crown className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Engaged Citizen</CardTitle>
                      <CardDescription>For engaged citizens who want deeper insights</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">£2.49</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {[
                      "Filter your feed by day, type, and topic",
                      "Track your MP's votes, key points, and top topics",
                      "Access the upcoming Parliamentary schedule",
                      "See how others voted on key issues",
                      "Access your voting analytics",
                      "Advanced Hansard search capabilities",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button 
                    className="w-full" 
                    onClick={handleSubscribe}
                  >
                    Upgrade Now
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setShowUpgradeDialog(false)}
                  >
                    Maybe Later
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to omit the house property
function omitHouse(filters: FeedFilters): Omit<FeedFilters, 'house'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { house, ...rest } = filters;
  return rest;
}