'use client';

import { AlertCircle, BarChart2, CalendarClock, User2 } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MenuItem } from './MenuItem';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '@/components/ui/card';
import { SignInPrompt } from '../ui/sign-in-prompt';

const VoteStats = dynamic(() => import("./VoteStats").then(mod => mod.VoteStats), {
  loading: () => <div className="animate-pulse h-[200px] bg-muted rounded-lg" />
});

const MPProfile = dynamic(() => import("./MPProfile").then(mod => mod.MPProfile));
const UpcomingDebates = dynamic(() => import("./UpcomingDebates").then(mod => mod.UpcomingDebates));

export function MyParliament() {
  const [activeTab, setActiveTab] = useState("activity");
  const { loading: authLoading, user } = useAuth();

  // Show a loading state for the entire dashboard while auth initializes
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex flex-row items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="bg-card border rounded-lg p-6 mt-8 h-[400px] animate-pulse" />
      </div>
    );
  }

  // If auth is done loading and there's no user, redirect to sign in
  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to access your dashboard"
        description="Track your voting patterns and see how they align with different topics and MPs"
      />
    );
  }

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
                  window.location.href = '/pricing';
                } else {
                  setActiveTab(item.id);
                }
              }
            }}
          />
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-card border rounded-lg p-6 mt-8">
        {activeTab === "activity" && <VoteStats />}
        {activeTab === "mp" && <MPProfile />}
        {activeTab === "upcoming" && <UpcomingDebates />}
        {activeTab === "stats" && <VoteStats />}
        {activeTab === "agreement" && (
          <div className="text-muted-foreground text-center py-8">
            MP Agreement analysis coming soon
          </div>
        )}
        {activeTab === "constituency" && (
          <div className="text-muted-foreground text-center py-8">
            Constituency insights coming soon
          </div>
        )}
      </div>
    </div>
  );
} 