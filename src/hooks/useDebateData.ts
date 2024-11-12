import { useQuery } from '@tanstack/react-query';

interface DebatesQueryParams {
  date?: string;
  limit?: number;
  cursor?: string;
}

export function useDebatesList(params?: DebatesQueryParams) {
  return useQuery({
    queryKey: ['debates', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set('date', params.date);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.cursor) searchParams.set('cursor', params.cursor);
      
      return fetch(`/api/debates?${searchParams.toString()}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch debates');
          return res.json();
        });
    },
  });
}

export function useDebateDetails(debateSectionExtId: string) {
  return useQuery({
    queryKey: ['debate', debateSectionExtId],
    queryFn: () => fetch(`/api/debates/${debateSectionExtId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch debate details');
        return res.json();
      }),
  });
}