"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ScrollText, Search, BookOpen, Settings, 
  Menu, User, LogOut, LogIn, UserPlus, Info, Sparkles, MessageSquare, Bookmark 
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

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, subscription } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const showUpgradeOption = user && !subscription;

  const renderAuthMenuItems = () => {
    return (
      <>
        <div className="px-4 py-3 border-b">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 rounded-full p-2">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="font-medium text-lg">Welcome to WhatGov</p>
            </div>
          )}
        </div>

        <div className="p-2">
          {user && (
            <>
              {showUpgradeOption && (
                <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer">
                  <Link href="/pricing" className="flex items-center space-x-3">
                    <div className="bg-secondary rounded-lg p-2">
                      <Sparkles className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Upgrade</p>
                      <p className="text-sm text-muted-foreground">Get premium features</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer">
                <Link href="/profile" className="flex items-center space-x-3">
                  <div className="bg-secondary rounded-lg p-2">
                    <User className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Profile</p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer md:hidden">
                <Link href="/settings" className="flex items-center space-x-3">
                  <div className="bg-secondary rounded-lg p-2">
                    <Settings className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Settings</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer">
            <Link href="/feedback" className="flex items-center space-x-3">
              <div className="bg-secondary rounded-lg p-2">
                <MessageSquare className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-medium">Feedback</p>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer">
            <Link href="/about" className="flex items-center space-x-3">
              <div className="bg-secondary rounded-lg p-2">
                <Info className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-medium">About</p>
              </div>
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="p-2">
          {user ? (
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="p-1 focus:bg-destructive/10 rounded-lg cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-destructive/10 rounded-lg p-2">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-destructive">Sign out</p>
                </div>
              </div>
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer">
                <Link href="/login" className="flex items-center space-x-3">
                  <div className="bg-secondary rounded-lg p-2">
                    <LogIn className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Sign in</p>
                    <p className="text-sm text-muted-foreground">Access your account</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-1 focus:bg-accent rounded-lg cursor-pointer">
                <Link href="/signup" className="flex items-center space-x-3">
                  <div className="bg-secondary rounded-lg p-2">
                    <UserPlus className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Sign up</p>
                    <p className="text-sm text-muted-foreground">Create a new account</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </div>
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
      title: "Saved Searches",
      href: "/saved",
      icon: Bookmark
    },
    {
      title: "My Parliament",
      href: "/myparliament",
      icon: BookOpen
    },
  ];

  const renderNavItem = (item: typeof navItems[0]) => (
    <TooltipProvider key={item.href} delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href}>
            <div className={cn(
              "flex items-center rounded-md px-4 text-lg font-medium hover:bg-accent hover:text-accent-foreground",
              "h-16 mt-6",
              "justify-center lg:justify-start",
              pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
              "lg:w-full"
            )}>
              <item.icon className="h-8 w-8" />
              <span className="hidden lg:block ml-4 font-semibold text-xl">
                {item.title}
              </span>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="lg:hidden text-xl">
          <span>{item.title}</span>
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
            className="flex h-16 items-center justify-center lg:justify-start border-b px-6 mb-4"
          >
            <span className="font-bold text-3xl lg:text-4xl logo-font tracking-tight transition-all duration-300 ease-in-out">
              <span className="lg:hidden transition-opacity duration-300 ease-in-out">W</span>
              <span className="hidden lg:inline transition-opacity duration-300 ease-in-out">WhatGov</span>
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
            {showUpgradeOption && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/pricing" className="hidden md:block">
                      <div className={cn(
                        "flex items-center rounded-md px-4 text-lg font-medium hover:bg-accent hover:text-accent-foreground",
                        "h-14",
                        "justify-center lg:justify-start",
                        pathname === '/pricing' ? "bg-accent text-accent-foreground" : "transparent",
                        "lg:w-full"
                      )}>
                        <Sparkles className="h-7 w-7" />
                        <span className="hidden lg:block ml-4 font-semibold text-xl">Upgrade</span>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="lg:hidden text-xl">
                    Upgrade
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/settings" className="hidden md:block">
                    <div className={cn(
                      "flex items-center rounded-md px-4 text-lg font-medium hover:bg-accent hover:text-accent-foreground",
                      "h-14",
                      "justify-center lg:justify-start",
                      pathname === '/settings' ? "bg-accent text-accent-foreground" : "transparent",
                      "lg:w-full"
                    )}>
                      <Settings className="h-7 w-7" />
                      <span className="hidden lg:block ml-4 font-semibold text-xl">Settings</span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden text-xl">
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
                        "flex items-center rounded-md px-4 text-lg font-medium hover:bg-accent hover:text-accent-foreground w-full",
                        "h-12",
                        "justify-center lg:justify-start",
                        "text-left"
                      )}>
                        <Menu className="h-6 w-6" />
                        <span className="hidden lg:block ml-4 font-semibold">More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-80 p-2"
                      sideOffset={8}
                    >
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
            >
              <div className={cn(
                "flex flex-col items-center p-2",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-6 w-6" />
                <span className="text-sm mt-1.5 font-medium">
                  {item.title}
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
            <DropdownMenuContent 
              align="end" 
              className="w-80 p-2"
              sideOffset={8}
            >
              {renderAuthMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}