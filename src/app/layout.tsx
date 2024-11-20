import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

export const metadata = {
  title: 'WhatGov | Have Your Say',
  description: 'Parliament in your feed. Vote on issues you care about, and understand how Parliament\'s decisions affect your community.',
  keywords: 'parliament, hansard, parliamentary debates, democracy, UK politics, MP voting records, legislative process',
  openGraph: {
    title: 'WhatGov | Have Your Say',
    description: 'Parliament in your feed. Vote on issues you care about, and understand how Parliament\'s decisions affect your community.',
    type: 'website',
    locale: 'en_GB',
    url: 'https://whatgov.co.uk',
    siteName: 'WhatGov'
  }
};

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
      </head> 
      <body>
        <ThemeProvider>
          <SupabaseProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </SupabaseProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}