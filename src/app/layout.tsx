import { Navbar } from "@/components/nav/Navbar";
import { Sidebar } from "@/components/nav/Sidebar";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

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
              <Sidebar className="w-16 lg:w-64 shrink-0 sticky top-0 h-screen" />
              <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 min-w-0 h-[calc(100vh-3.5rem)] md:h-screen overflow-y-auto pb-16 md:pb-0">
                  {children}
                </main>
              </div>
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}