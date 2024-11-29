import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata = {
  title: 'WhatGov | Parliament in Your Feed',
  description: 'Track the issues you care about with Parliamentary Monitoring in your feed.',
  keywords: 'parliament, hansard, parliamentary debates, democracy, UK politics, MP voting records, legislative process',
  openGraph: {
    title: 'WhatGov | Parliament in Your Feed',
    description: 'Track the issues you care about with Parliamentary Monitoring in your feed.',
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://whatgov.co.uk" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" type="application/manifest+json" />
        <script dangerouslySetInnerHTML={{ __html: swRegistration }} />
      </head> 
      <body>
        <ThemeProvider>
          <SupabaseProvider>
            <AuthProvider>
              <QueryProvider>
                {children}
              </QueryProvider>
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}