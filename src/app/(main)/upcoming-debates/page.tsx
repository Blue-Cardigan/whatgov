import dynamic from 'next/dynamic'
import { WeekSkeleton } from '@/components/UpcomingDebates/CalendarSkeleton'

// Lazy load UpcomingDebates component
const UpcomingDebates = dynamic(
  () => import('@/components/UpcomingDebates').then(mod => mod.UpcomingDebates),
  {
    loading: () => <WeekSkeleton />,
    ssr: true
  }
)

export const metadata = {
  title: 'Upcoming Debates | WhatGov',
  description: 'View upcoming parliamentary debates and events',
};

export default function UpcomingDebatesPage() {
  return (
    <main className="h-full flex flex-col p-4 md:p-6">
      <div className="flex-1">
        <UpcomingDebates />
      </div>
    </main>
  );
} 