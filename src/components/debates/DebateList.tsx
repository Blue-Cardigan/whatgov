'use client';

import { useDebatesList } from '@/hooks/useDebateData';
import { DebateListItem } from './DebateListItem';
import { useRouter, useSearchParams } from 'next/navigation';

interface DebateListProps {
  initialData: any[];
}

interface Debate {
  ExternalId: string;
  Title: string;
  ItemDate: string;
  HRSTag?: string;
}

export function DebateList({ initialData }: DebateListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  
  const { data: debates = initialData, isLoading } = useDebatesList();

  const handleSelectDebate = (id: string) => {
    router.push(`/debates?id=${id}`, { scroll: false });
  };

  if (isLoading && !debates.length) {
    return <div className="p-4">Loading debates...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {debates?.map((debate: Debate) => (
        <DebateListItem
          key={debate.ExternalId}
          debate={{
            ExternalId: debate.ExternalId,
            Title: debate.Title,
            ItemDate: debate.ItemDate || new Date().toISOString(),
            Description: debate.HRSTag
          }}
          isSelected={debate.ExternalId === selectedId}
          onClick={() => handleSelectDebate(debate.ExternalId)}
        />
      ))}
    </div>
  );
}