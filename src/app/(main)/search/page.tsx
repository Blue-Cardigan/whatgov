import { SimpleFooter } from '@/components/layout/SimpleFooter';
import { Search } from '@/components/search';

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="container max-w-4xl mx-auto px-4 flex-1">
        <Search />
      </div>
      <SimpleFooter />
    </div>
  );
}