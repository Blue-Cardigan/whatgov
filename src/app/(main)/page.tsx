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
  title: 'WhatGov | Direct Access to Parliament',
  description: 'Parliament, without the Spin',
};

export default function DebatesPage() {
  return (
    <>
      <DebateFeed />
    </>
  );
}