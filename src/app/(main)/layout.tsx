import { Sidebar } from "@/components/nav/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar className="w-20 lg:w-72 shrink-0 sticky top-0 h-screen" />
      <main className="flex-1 min-w-0 h-screen overflow-y-auto pb-16 md:pb-0 lg:pr-72">
        {children}
      </main>
    </div>
  );
} 