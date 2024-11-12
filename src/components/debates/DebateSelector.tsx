'use client'

import { useRouter, useSearchParams } from 'next/navigation';

export function DebateSelector({ 
  debateId, 
  onSelect 
}: { 
  debateId: string;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  
  const handleSelect = () => {
    router.push(`/debates?id=${debateId}`, { scroll: false });
    onSelect(debateId);
  };

  return (
    <button onClick={handleSelect}>
      {/* Debate selection UI */}
    </button>
  );
} 