import { Navbar } from "@/components/nav/Navbar";
import { Sidebar } from "@/components/nav/Sidebar";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex">
              <Sidebar className="hidden md:block w-64 shrink-0" />
              <main className="flex-1 min-w-0">
                {children}
              </main>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}