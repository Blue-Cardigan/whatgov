import { DebateFeed } from '@/components/debates/DebateFeed';

export const metadata = {
  title: 'Latest Debates | Have Your Say',
  description: 'Explore the latest debates on our platform. Join discussions on politics, science, philosophy, and more.',
};

export default function DebatesPage() {
  return (
    <>
      <h1 className="sr-only">Latest Debates and Discussions</h1>
      <DebateFeed />
    </>
  );
}