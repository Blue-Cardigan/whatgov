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
  
  // Add detailed logging for hansardData
  useEffect(() => {
    console.log('ProcessDebateClient received hansardData:', {
      exists: !!hansardData,
      hasItems: hansardData?.Items?.length ?? 0 > 0,
      itemCount: hansardData?.Items?.length ?? 0,
      debateId: rawDebate.ext_id
    });
  }, [hansardData, rawDebate.ext_id]);
  
  return (
    <DebateView 
      debate={processedDebate} 
      hansardData={hansardData}
    />
  );
} 