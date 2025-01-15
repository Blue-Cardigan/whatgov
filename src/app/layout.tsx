import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from "@/contexts/AuthContext";
import { Playfair_Display } from 'next/font/google'
import { SearchProvider } from '@/contexts/SearchContext';
import { preloadParliamentImages } from '@/lib/utils/parliamentImages';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

// Add this near the top of RootLayoModule '"@/lib/utils/parliamentImages"' has no exported member 'preloadParliamentImages'.ts(2305)ut
const criticalStyles = `
  body { 
    font-family: Arial, Helvetica, sans-serif;
    background-color: var(--background);
    color: var(--foreground);
  }
`;

export const metadata = {
  title: 'WhatGov | Direct Access to Parliament',
  description: 'Parliament, without the Spin',
  keywords: 'parliament, hansard, parliamentary debates, democracy, UK politics, MP voting records, legislative process, direct democracy',
  openGraph: {
    title: 'WhatGov | Direct Access to Parliament',
    description: 'Parliament, Without the Spin',
    type: 'website',
    locale: 'en_GB',
    url: 'https://whatgov.co.uk',
    siteName: 'WhatGov'
  }
};

// Add this script to register the service worker
const swRegistration = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(
        function(registration) {
          console.log('ServiceWorker registration successful');
        },
        function(err) {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Preload images on client side
  if (typeof window !== 'undefined') {
    preloadParliamentImages();
  }

  return (
    <html lang="en" suppressHydrationWarning className={playfair.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://whatgov.co.uk" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" type="application/manifest+json" />
        <script dangerouslySetInnerHTML={{ __html: swRegistration }} />
        <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
      </head> 
      <body>
        <SearchProvider>
          <ThemeProvider>
            <SupabaseProvider>
              <AuthProvider>
                <QueryProvider>
                  {children}
                </QueryProvider>
              </AuthProvider>
            </SupabaseProvider>
          </ThemeProvider>
        </SearchProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}