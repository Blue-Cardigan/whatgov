import { Topbar } from "@/components/nav/Topbar";
import { SpeedInsights } from "@vercel/speed-insights/next"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar className="h-16 shrink-0 sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
        <SpeedInsights />
      </main>
    </div>
  );
} 