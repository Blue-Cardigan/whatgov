import { useQuery } from '@tanstack/react-query';
import { HansardAPI } from '@/lib/hansard-api';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export function useDebatesList() {
  const today = '2024-11-06';
  
  return useQuery({
    queryKey: ['debates', today],
    queryFn: () => fetch('/api/debates')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch debates');
        return res.json();
      }),
  });
}

export function useDebateDetails(debateSectionExtId: string) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['debate', debateSectionExtId],
    queryFn: () => HansardAPI.getDebateDetails(debateSectionExtId, supabase),
  });
}