"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  BookOpen,
  Settings,
  Info,
  LogOut,
  LogIn,
  Menu,
  UserPlus,
  Crown,
  ScrollText,
  BookMarked
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
  
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
      router.push('/login');
      return;
    }

    if (!isPremium) {
      toast({
        title: "Professional plan required",
        description: "Upgrade to Professional to access research tools",
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
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderAuthMenuItems = () => {
    return (
      <>
        <DropdownMenuItem asChild className="md:hidden">
          <Link href="/settings" className="flex w-full items-center">
            <Settings className="h-4 w-4 mr-2.5" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/about" className="flex w-full items-center">
            <Info className="h-4 w-4 mr-2.5" />
            <span>About</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="flex w-full items-center text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2.5" />
            <span>Sign out</span>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href='/login' className="flex w-full items-center">
                <LogIn className="h-4 w-4 mr-2.5" />
                <span>Sign in</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/signup" className="flex w-full items-center">
                <UserPlus className="h-4 w-4 mr-2.5" />
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
    ...(isPremium ? [{
      title: "Research",
      href: "/research",
      icon: BookMarked,
      isPremium: true,
    }] : [])
  ];

  const renderNavItem = (item: typeof navItems[0]) => (
    <TooltipProvider key={item.href} delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            href={item.href}
            onClick={item.isPremium ? (e) => handlePremiumNavigation(e, item.href) : undefined}
          >
            <div className={cn(
              "flex items-center rounded-md px-4 text-base font-medium hover:bg-accent hover:text-accent-foreground",
              "h-12",
              "justify-center lg:justify-start",
              pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
              "lg:w-full",
              item.isPremium && !isPremium && "opacity-75"
            )}>
              <item.icon className="h-6 w-6" />
              <span className="hidden lg:block ml-4 font-semibold">
                {item.title}
                {item.isPremium && !isPremium && (
                  <Crown className="inline-block h-4 w-4 ml-1.5 text-primary" />
                )}
              </span>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="lg:hidden text-base">
          <span>{item.title}</span>
          {item.isPremium && !isPremium && (
            <Crown className="inline-block h-4 w-4 ml-1.5 text-primary" />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "border-r overflow-y-auto hidden md:block z-50 h-screen flex-col",
        className
      )}>
        <div className="flex flex-col h-full py-4">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex h-14 items-center justify-center lg:justify-start border-b px-6 mb-4"
          >
            <span className="font-bold text-xl">
              <span className="lg:hidden">W</span>
              <span className="hidden lg:inline">WhatGov</span>
            </span>
          </Link>

          {/* Main Navigation */}
          <div className="px-3 flex-1">
            <div className="space-y-2">
              {navItems.map(renderNavItem)}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="px-3 mt-auto border-t pt-4 space-y-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/settings" className="hidden md:block">
                    <div className={cn(
                      "flex items-center rounded-md px-4 text-base font-medium hover:bg-accent hover:text-accent-foreground",
                      "h-12",
                      "justify-center lg:justify-start",
                      pathname === '/settings' ? "bg-accent text-accent-foreground" : "transparent",
                      "lg:w-full"
                    )}>
                      <Settings className="h-6 w-6" />
                      <span className="hidden lg:block ml-4 font-semibold">Settings</span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden text-base">
                  Settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn(
                        "flex items-center rounded-md px-4 text-base font-medium hover:bg-accent hover:text-accent-foreground w-full",
                        "h-12",
                        "justify-center lg:justify-start",
                        "text-left"
                      )}>
                        <Menu className="h-6 w-6" />
                        <span className="hidden lg:block ml-4 font-semibold">More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {renderAuthMenuItems()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden text-base">
                  More
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="flex justify-around py-3">
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
                <item.icon className="h-6 w-6" />
                <span className="text-sm mt-1.5 font-medium">
                  {item.title}
                  {item.isPremium && !isPremium && (
                    <Crown className="inline-block h-4 w-4 ml-1.5 text-primary" />
                  )}
                </span>
              </div>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center p-2 text-muted-foreground">
                <Menu className="h-6 w-6" />
                <span className="text-sm mt-1.5">More</span>
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