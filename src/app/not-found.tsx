import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink, ScrollText } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {/* Main Content */}
      <div className="text-center px-4 mb-12">
        <div className="flex justify-center mb-6">
          <AlertCircle className="h-24 w-24 text-muted-foreground" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4">
          Page Not Found
        </h1>
        
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Button asChild className="px-6">
          <Link href="/" className="inline-flex items-center">
            <ScrollText className="mr-2 h-4 w-4" />
            Return to Homepage
          </Link>
        </Button>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-card border-t border-border/50 dark:border-border/30 py-8">
          <div className="container max-w-xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              {/* Navigation Links */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Navigation</h3>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/search" className="hover:text-foreground transition-colors">
                      Search
                    </Link>
                  </li>
                  <li>
                    <Link href="/calendar" className="hover:text-foreground transition-colors">
                      Calendar
                    </Link>
                  </li>
                  <li>
                    <Link href="/saved" className="hover:text-foreground transition-colors">
                      Saved
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal Links */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/about/terms" className="hover:text-foreground transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/about/privacy" className="hover:text-foreground transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Data Source */}
              <div className="space-y-3 col-span-2 md:col-span-1">
                <h3 className="font-semibold text-sm">Data Source</h3>
                <div className="text-sm text-muted-foreground">
                  <a 
                    href="https://hansard.parliament.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:text-foreground transition-colors"
                  >
                    hansard.parliament.uk
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 