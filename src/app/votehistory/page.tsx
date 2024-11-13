import { DebateHistory } from '@/components/debates/DebateHistory';

export default function HistoryPage() {
  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Your Vote History</h1>
      <DebateHistory />
    </div>
  );
}