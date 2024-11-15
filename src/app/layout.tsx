import { Sidebar } from "@/components/nav/Sidebar";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <div className="min-h-screen bg-background flex">
              <Sidebar className="w-20 lg:w-72 shrink-0 sticky top-0 h-screen" />
              <main className="flex-1 min-w-0 h-screen overflow-y-auto pb-16 md:pb-0">
                {children}
              </main>
            </div>
          </QueryProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}