import dynamic from 'next/dynamic'

// Lazy load non-critical components
const DebateFeed = dynamic(
  () => import('@/components/debates/DebateFeed').then(mod => mod.DebateFeed),
  {
    loading: () => <p>Loading feed...</p>,
    ssr: true
  }
)

export const metadata = {
  title: 'WhatGov | Have Your Say',
  description: 'Parliament in your feed. Vote on issues you care about, and understand how Parliament\'s decisions affect your community.',
};

export default function DebatesPage() {
  return (
    <>
      <DebateFeed />
    </>
  );
}