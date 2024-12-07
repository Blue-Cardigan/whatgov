import { MyParliament } from '@/components/myparliament';
import { SimpleFooter } from '@/components/layout/SimpleFooter';

export default function MyParliamentPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <MyParliament />
      </div>
      <SimpleFooter />
    </div>
  );
}