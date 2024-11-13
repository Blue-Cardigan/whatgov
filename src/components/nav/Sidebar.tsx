"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  BookOpen,
  Users,
  Settings
} from "lucide-react";
import { useTopics } from '@/hooks/useTopics';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { topics, isLoading, error } = useTopics();

  const navItems = [
    {
      title: "Home",
      href: "/",
      icon: Home
    },
    {
      title: "Search",
      href: "/search",
      icon: Search
    },
    {
      title: "History",
      href: "/history",
      icon: BookOpen
    },
    {
      title: "Members",
      href: "/members",
      icon: Users
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings
    }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn("border-r overflow-y-auto hidden md:block", className)}>
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
                    "lg:w-full"
                  )}>
                    <item.icon className="h-5 w-5" />
                    <span className="hidden lg:block ml-3">{item.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center p-2",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}