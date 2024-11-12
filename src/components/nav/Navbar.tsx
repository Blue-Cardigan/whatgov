"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Menu,
  Bell,
  User,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center justify-between">
        {/* Logo and Main Nav */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="font-bold text-xl ml-2">
            WhatGov
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/debates" className="text-sm font-medium">
              Debates
            </Link>
            <Link href="/search" className="text-sm font-medium">
              Search
            </Link>
          </div>
        </div>

        {/* Search and User Actions */}
        <div className="flex items-center space-x-4">
          {/* Desktop Search */}
          <div className="hidden md:flex items-center">
            <form className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search debates..."
                className="pl-8 w-[200px] lg:w-[300px]"
              />
            </form>
          </div>

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuItem>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/signin">Sign in</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/signup">Sign up</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <div className="border-t md:hidden p-4">
          <form className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search debates..."
              className="pl-8 w-full"
            />
          </form>
        </div>
      )}
    </nav>
  );
}