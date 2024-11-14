"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  BookOpen,
  Users,
  Settings,
  Info,
  LogOut,
  LogIn,
  Menu,
  UserPlus,
  Crown,
  ScrollText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isPremium } = useAuth();

  const handlePremiumNavigation = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to access this feature",
        variant: "destructive",
      });
      router.push('/auth/signin');
      return;
    }

    if (!isPremium) {
      toast({
        title: "Premium feature",
        description: "Upgrade to access research tools",
        variant: "destructive",
      });
      router.push('/pricing');
      return;
    }

    router.push(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderAuthMenuItems = () => {
    return (
      <>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/info" className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            <span>Info</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="flex items-center text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Sign out</span>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/auth/signin" className="flex items-center">
                <LogIn className="h-4 w-4 mr-2" />
                <span>Sign in</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/auth/signup" className="flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                <span>Sign up</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </>
    );
  };

  const navItems = [
    {
      title: "Feed",
      href: "/",
      icon: ScrollText
    },
    {
      title: "Search",
      href: "/search",
      icon: Search
    },
    {
      title: "My Parliament",
      href: "/myparliament",
      icon: BookOpen
    },
    {
      title: "Research",
      href: "/research",
      icon: Users,
      isPremium: true,
    }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "border-r overflow-y-auto hidden md:block z-50",
        className
      )}>
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              {/* Logo */}
              <Link 
                href="/" 
                className="flex h-14 items-center border-b px-3"
              >
                <span className="font-bold text-xl">
                  <span className="lg:hidden">W</span>
                  <span className="hidden lg:inline">WhatGov</span>
                </span>
              </Link>

              {/* Nav Items */}
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={item.isPremium ? (e) => handlePremiumNavigation(e, item.href) : undefined}
                >
                  <div className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
                    "lg:w-full",
                    item.isPremium && !isPremium && "opacity-75"
                  )}>
                    <item.icon className="h-5 w-5" />
                    <span className="hidden lg:block ml-3">
                      {item.title}
                      {item.isPremium && !isPremium && (
                        <Crown className="inline-block h-3 w-3 ml-1 text-primary" />
                      )}
                    </span>
                  </div>
                </Link>
              ))}

              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground w-full",
                    "lg:w-full"
                  )}>
                    <Menu className="h-5 w-5" />
                    <span className="hidden lg:block ml-3">More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {renderAuthMenuItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={item.isPremium ? (e) => handlePremiumNavigation(e, item.href) : undefined}
            >
              <div className={cn(
                "flex flex-col items-center p-2",
                pathname === item.href ? "text-primary" : "text-muted-foreground",
                item.isPremium && !isPremium && "opacity-75"
              )}>
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">
                  {item.title}
                  {item.isPremium && !isPremium && (
                    <Crown className="inline-block h-3 w-3 ml-1 text-primary" />
                  )}
                </span>
              </div>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center p-2 text-muted-foreground">
                <Menu className="h-5 w-5" />
                <span className="text-xs mt-1">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {renderAuthMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}