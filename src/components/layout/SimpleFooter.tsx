import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function SimpleFooter() {
  return (
    <div className="mt-auto border-t border-border/50 pt-6 pb-4 w-full">
      <div className="text-sm text-muted-foreground text-center space-y-4">
        <div className="space-x-4">
          <Link href="/about/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/about/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <a href="https://hansard.parliament.uk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:text-foreground transition-colors">
            Data Source <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
        <p className="text-xs">
          All content derived from official parliamentary records
        </p>
      </div>
    </div>
  );
} 