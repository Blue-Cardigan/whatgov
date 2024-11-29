'use client';

import { AlertCircle, BarChart2, CalendarClock, User2 } from 'lucide-react';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { MenuItem } from './MenuItem';
import { AuthenticatedRoute } from '@/components/auth/AuthenticatedRoute';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { PLANS } from '@/lib/stripe-client';
import { useAuth } from '@/contexts/AuthContext';

const VoteStats = dynamic(() => import("./VoteStats").then(mod => mod.VoteStats), {
  loading: () => <div className="animate-pulse h-[600px] bg-muted rounded-lg" />
});

const MPProfile = dynamic(() => import("./MPProfile").then(mod => mod.MPProfile), {
  loading: () => <div className="animate-pulse h-[400px] bg-muted rounded-lg" />
});

const UpcomingDebates = dynamic(() => import("./UpcomingDebates").then(mod => mod.UpcomingDebates), {
  loading: () => <div className="animate-pulse h-[500px] bg-muted rounded-lg" />
});

export function MyParliament() {
  return (
    <AuthenticatedRoute
      requireProfile={true}
      signInPrompt={{
        title: "Sign in to access your dashboard",
        description: "Track your MP's activity, and voting patterns of the UK and your constituency"
      }}
    >
      <MyParliamentContent />
    </AuthenticatedRoute>
  );
}

// Separate the content to avoid unnecessary re-renders
function MyParliamentContent() {
  const [activeTab, setActiveTab] = useState("mp");
  const { user, getAuthHeader } = useAuth();
  const router = useRouter();

  const handlePremiumFeature = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to access premium features",
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

      if (!response.ok) throw new Error(await response.text());

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

  const menuItems = [
    {
      id: "mp",
      title: "Your MP",
      description: "Track your MP's activity",
      icon: <User2 className="h-6 w-6" />,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-500/10",
      borderColor: "group-hover:border-purple-200 dark:group-hover:border-purple-500/30",
      isPremium: false,
    },
    {
      id: "stats",
      title: "Voting Statistics",
      description: "Your stats and popular topics",
      icon: <BarChart2 className="h-6 w-6" />,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
      borderColor: "group-hover:border-emerald-200 dark:group-hover:border-emerald-500/30",
      isPremium: false,
    },
    {
      id: "upcoming",
      title: "Upcoming Questions",
      description: "See what's coming up",
      icon: <CalendarClock className="h-6 w-6" />,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
      borderColor: "group-hover:border-amber-200 dark:group-hover:border-amber-500/30",
      isPremium: false,
    },
    {
      id: "alerts",
      title: "Search Alerts",
      description: "Subscribe to searches",
      icon: <AlertCircle className="h-6 w-6" />,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "group-hover:border-muted",
      isPremium: false,
      isDisabled: true,
      badge: "Coming soon"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            isActive={item.id === activeTab}
            onSelect={() => {
              if (!item.isDisabled) {
                if (item.isPremium) {
                  handlePremiumFeature();
                } else {
                  setActiveTab(item.id);
                }
              }
            }}
          />
        ))}
      </div>

      {/* Content Area with loading state */}
      <div className="mt-6">
        <Suspense fallback={<div className="animate-pulse h-[500px] bg-muted rounded-lg" />}>
          {activeTab === "activity" && <VoteStats />}
          {activeTab === "mp" && <MPProfile />}
          {activeTab === "upcoming" && <UpcomingDebates />}
          {activeTab === "stats" && <VoteStats />}
        </Suspense>
      </div>
    </div>
  );
} 