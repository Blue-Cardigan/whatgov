'use client';

import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DebateItem } from './DebateItem';

interface DebateContentProps {
  items: any[];
  generated: any[];
}

export function DebateContent({ items, generated }: DebateContentProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Create map of generated content
  const generatedMap = useMemo(() => {
    return new Map(
      generated.map(g => [g.original_contribution_id, g])
    );
  }, [generated]);

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Adjust based on average item height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                padding: '1rem', // Matches your existing p-4
              }}
            >
              <DebateItem
                item={item}
                generatedContent={generatedMap.get(item.ExternalId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}