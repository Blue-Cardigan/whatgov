import { getRedisValue } from '@/app/actions/redis';
import { DebatesLayout } from '@/components/debates/DebatesLayout';
import { Suspense } from 'react';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function DebatesPage({
  searchParams,
}: PageProps) {
  const selectedDebateId = typeof searchParams.id === 'string' 
    ? searchParams.id 
    : undefined;

  const today = '2024-11-12';
  const cacheKey = `debates:${today}`;
  
  let debates;
  try {
    debates = await getRedisValue(cacheKey);
    
    if (!debates) {
      const response = await fetch('/api/debates', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch debates');
      debates = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch debates:', error);
    debates = [];
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DebatesLayout 
        initialDebates={debates} 
        selectedDebateId={selectedDebateId} 
      />
    </Suspense>
  );
}
