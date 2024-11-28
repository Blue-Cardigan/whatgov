import { DebateFeed } from '@/components/debates/DebateFeed';

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