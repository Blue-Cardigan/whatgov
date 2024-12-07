import { SimpleFooter } from '@/components/layout/SimpleFooter';
import { SavedSearches } from '@/components/SavedSearches';

export const metadata = {
  title: 'Saved Searches',
  description: 'View your saved AI-powered parliamentary searches',
};

export default function SavedSearchesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SavedSearches />
      <SimpleFooter />
    </div>
  );
} 