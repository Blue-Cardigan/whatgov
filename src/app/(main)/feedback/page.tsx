import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { SimpleFooter } from '@/components/layout/SimpleFooter';

export default function FeedbackPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-2xl mx-auto py-8 px-4 flex-1 flex flex-col">
        <FeedbackForm />
      </div>
      <SimpleFooter />
    </div>
  );
} 