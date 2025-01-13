'use client';

import type { Database } from '@/types/supabase';
import { DebateView } from './DebateView';
import type { HansardDebateResponse } from '@/types/hansard';

interface ProcessDebateClientProps {
  rawDebate: Database['public']['Tables']['debates_new']['Row'];
  hansardData?: HansardDebateResponse;
}

export function ProcessDebateClient({ rawDebate, hansardData }: ProcessDebateClientProps) {
  // Pass the debate data directly to DebateView
  return (
    <DebateView 
      debate={rawDebate} 
      hansardData={hansardData}
    />
  );
} 