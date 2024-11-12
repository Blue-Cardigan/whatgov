'use client';

import { DebateList } from './DebateList';
import { DebateView } from './DebateView';

interface Debate {
  ExternalId: string;
  Title: string;
  ItemDate?: string;
  HRSTag?: string;
}

interface DebatesLayoutProps {
  initialDebates: Debate[];
  selectedDebateId?: string;
}

export function DebatesLayout({ 
  initialDebates, 
  selectedDebateId 
}: DebatesLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-80 border-r overflow-y-auto">
        <DebateList initialData={initialDebates} />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {selectedDebateId ? (
          <DebateView debateSectionExtId={selectedDebateId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a debate to view
          </div>
        )}
      </div>
    </div>
  );
} 