'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserVoteHistory } from "./UserVoteHistory";
import { MPProfile } from "./MPProfile";
import { UpcomingDebates } from "./UpcomingDebates";
import { CalendarClock, User2, Vote, Crown, BarChart2, ThumbsUp, Building2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function MyParliament() {
  const { user } = useAuth();
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
      title: "Vote Alerts",
      description: "Get notified when your search terms are mentioned",
      icon: <AlertCircle className="h-6 w-6" />,
      color: "text-teal-500",
      bgColor: "bg-teal-50 dark:bg-teal-500/10",
      borderColor: "group-hover:border-teal-200 dark:group-hover:border-teal-500/30",
      isPremium: true,
    }
  ];

  return (
    <div className="space-y-8">
      {/* Grid of Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <Card
            key={item.id}
            className={cn(
              "group border transition-all duration-200",
              "hover:shadow-md cursor-pointer",
              item.id === activeTab && "ring-2 ring-primary ring-offset-2",
              item.isPremium && "bg-gradient-to-br from-primary/5 to-primary/10"
            )}
            onClick={() => item.isPremium ? window.location.href = '/pricing' : setActiveTab(item.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-3 rounded-xl transition-colors duration-200",
                    item.bgColor,
                    item.color
                  )}
                >
                  {item.icon}
                </div>
                <div>
                  <CardTitle className={cn(
                    "text-base font-semibold transition-colors duration-200",
                    `group-hover:${item.color}`
                  )}>
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {item.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-card border rounded-lg p-6">
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