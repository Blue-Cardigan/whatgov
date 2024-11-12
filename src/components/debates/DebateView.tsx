'use client';

import { useDebateDetails } from '@/hooks/useDebateData';
import { DebateHeader } from './DebateHeader';
import { DebateContent } from './DebateContent';

export function DebateView({ debateSectionExtId }: { debateSectionExtId: string }) {
  const { data, isLoading, isError } = useDebateDetails(debateSectionExtId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-xl mb-2">Loading debate...</div>
          <div className="text-gray-600">This may take a few moments</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-xl mb-2">Error loading debate</div>
          <div className="text-gray-600">Please try again later</div>
        </div>
      </div>
    );
  }

  const { debate, speakers, generated } = data;

  return (
    <div className="flex flex-col h-full">
      <DebateHeader
        title={debate.Overview.Title}
        date={debate.Overview.Date}
        speakers={speakers}
      />
      <DebateContent
        items={debate.Items}
        generated={generated || []}
      />
    </div>
  );
}