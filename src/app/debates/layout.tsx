import { QueryProvider } from '@/providers/QueryProvider';

export default function DebatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
} 