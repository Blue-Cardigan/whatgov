'use client';

import { AlertCircle, BarChart2, CalendarClock, User2 } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MenuItem } from './MenuItem';

const UserVoteHistory = dynamic(() => import("./YourStats").then(mod => mod.UserVoteHistory), {
  loading: () => <div className="animate-pulse h-[200px] bg-muted rounded-lg" />
});

const MPProfile = dynamic(() => import("./MPProfile").then(mod => mod.MPProfile));
const UpcomingDebates = dynamic(() => import("./UpcomingDebates").then(mod => mod.UpcomingDebates));

export function MyParliament() {
  const [activeTab, setActiveTab] = useState("activity");

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
      title: "Your Statistics",
      description: "Analyse your engagement",
      icon: <BarChart2 className="h-6 w-6" />,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
      borderColor: "group-hover:border-emerald-200 dark:group-hover:border-emerald-500/30",
      isPremium: false,
    },
    {
      id: "upcoming",
      title: "Upcoming Votes",
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
      color: "text-teal-500",
      bgColor: "bg-teal-50 dark:bg-teal-500/10",
      borderColor: "group-hover:border-teal-200 dark:group-hover:border-teal-500/30",
      isPremium: true,
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
            onSelect={() => item.isPremium ? window.location.href = '/pricing' : setActiveTab(item.id)}
          />
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-card border rounded-lg p-6 mt-8">
        {activeTab === "activity" && <UserVoteHistory />}
        {activeTab === "mp" && <MPProfile />}
        {activeTab === "upcoming" && <UpcomingDebates />}
        {activeTab === "stats" && <UserVoteHistory />}
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
        {activeTab === "alerts" && (
          <div className="text-muted-foreground text-center py-8">
            Vote alerts feature coming soon
          </div>
        )}
      </div>
    </div>
  );
} 