import dynamic from 'next/dynamic'
import { DebateSkeleton } from '@/components/debates/DebateSkeleton'

// Lazy load UpcomingDebates component
const UpcomingDebates = dynamic(
  () => import('@/components/UpcomingDebates').then(mod => mod.UpcomingDebates),
  {
    loading: () => (
      <div className="min-h-screen flex flex-col md:pr-20">
        <div className="container max-w-xl mx-auto px-4 flex-1">
          <DebateSkeleton />
        </div>
      </div>
    ),
    ssr: true
  }
)

export const metadata = {
  title: 'WhatGov | Direct Access to Parliament',
  description: 'Parliament, without the Spin',
};

export default function DebatesPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6">
      <div className="flex-1">
        <UpcomingDebates />
      </div>
    </main>
  );
}