"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, Calendar, Settings, 
  Menu, User, LogOut, Sparkles, Bookmark 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useEffect, useState } from "react";

interface TopbarProps {
  className?: string;
}

export function Topbar({ className }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, subscription } = useAuth();
  const supabase = useSupabase();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    async function checkUnread() {
      if (!user?.id) return;
      
      const { count, error } = await supabase
        .from('saved_searches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_unread', true);
        
      if (error) {
        console.error('Error checking unread status:', error);
        return;
      }
      
      setHasUnread((count || 0) > 0);
    }
    
    checkUnread();
    
    const channel = supabase
      .channel('saved_searches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_searches',
          filter: `user_id=eq.${user?.id}`
        },
        () => checkUnread()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const showUpgradeOption = user && !subscription;

  const navItems = [
    {
      title: "This Week",
      href: "/",
      icon: Calendar
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: Calendar
    },
    {
      title: "Search",
      href: "/search",
      icon: Search
    },
    {
      title: "Saved",
      href: "/saved",
      icon: Bookmark,
      hasNotification: hasUnread
    }
  ];

  return (
    <header className={cn("px-4", className)}>
      <div className="flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl logo-font">WhatGov</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary relative",
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
              {item.hasNotification && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        {/* Auth and Mobile Menu */}
        <div className="flex items-center space-x-4">
          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
                {showUpgradeOption && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/pricing" className="flex items-center">
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>Upgrade</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 md:hidden">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center relative">
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                    {item.hasNotification && (
                      <span className="absolute top-1/2 -translate-y-1/2 right-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}