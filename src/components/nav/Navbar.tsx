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
  const { user } = useAuth();
  
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex hidden">
      <div className="container h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl">
          WhatGov
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-lg px-4">
          <form className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search debates..."
              className="pl-8 w-full"
            />
          </form>
        </div>

        {/* User Avatar */}
        <Button variant="ghost" size="icon">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}