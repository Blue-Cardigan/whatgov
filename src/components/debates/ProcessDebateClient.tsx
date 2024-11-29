'use client';

import { processDebates } from '@/lib/supabase/feed';
import type { Database } from '@/types/supabase';
import { DebateView } from './DebateView';
import { useMemo, useEffect } from 'react';
import type { HansardDebateResponse } from '@/types/hansard';

interface ProcessDebateClientProps {
  rawDebate: Database['public']['Functions']['get_unvoted_debates']['Returns'][0];
  hansardData?: HansardDebateResponse;
}

export function ProcessDebateClient({ rawDebate, hansardData }: ProcessDebateClientProps) {
  // Process the debate data using existing utility
  const processedDebate = useMemo(() => {
    const { items } = processDebates([rawDebate], 1);
    return items[0];
  }, [rawDebate]);
  
  return (
    <DebateView 
      debate={processedDebate} 
      hansardData={hansardData}
    />
  );
} 