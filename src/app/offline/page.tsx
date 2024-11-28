'use client';

import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Simplified sidebar placeholder */}
      <div className="w-20 lg:w-72 shrink-0 border-r" />
      
      <main className="flex-1 min-w-0">
        <div className="container max-w-xl mx-auto px-4 h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <ScrollText className="h-16 w-16 mx-auto text-muted-foreground" />
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">You&apos;re Offline</h1>
              <p className="text-muted-foreground text-lg">
                Please check your internet connection to continue browsing Parliamentary debates
              </p>
            </div>

            <Button 
              onClick={() => window.location.reload()} 
              className="h-10 px-8 gap-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
} 