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
  Tag,
  Settings,
  HelpCircle
} from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Home",
      href: "/",
      icon: Home
    },
    {
      title: "Debates",
      href: "/debates",
      icon: BookOpen
    },
    {
      title: "Search",
      href: "/search",
      icon: Search
    },
    {
      title: "Members",
      href: "/members",
      icon: Users
    },
    {
      title: "Topics",
      href: "/topics",
      icon: Tag
    }
  ];

  const bottomNavItems = [
    {
      title: "Settings",
      href: "/settings",
      icon: Settings
    },
    {
      title: "Help",
      href: "/help",
      icon: HelpCircle
    }
  ];

  return (
    <div className={cn("pb-12 border-r", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
              >
                <div
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "transparent"
                  )}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Followed Topics
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start">
              <Tag className="h-4 w-4 mr-2" />
              Healthcare
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Tag className="h-4 w-4 mr-2" />
              Education
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Tag className="h-4 w-4 mr-2" />
              Environment
            </Button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 border-t">
          <div className="px-3 py-2">
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
              >
                <div
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "transparent"
                  )}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}