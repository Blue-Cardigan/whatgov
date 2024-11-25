import { SpeedInsights } from "@vercel/speed-insights/next"

export default function IntroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      {children}
      <SpeedInsights />
    </main>
  );
} 