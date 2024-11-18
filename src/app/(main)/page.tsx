import { DebateFeed } from '@/components/debates/DebateFeed';

export const metadata = {
  title: 'WhatGov | Have Your Say',
  description: 'Engage with complex parliamentary debates as short posts. Track issues you care about, and understand how Parliament\'s decisions affect your community.',
};

export default function DebatesPage() {
  return (
    <>
      <h1 className="sr-only">Latest Debates and Discussions</h1>
      <DebateFeed />
    </>
  );
}