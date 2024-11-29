import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { ProcessDebateClient } from '@/components/debates/ProcessDebateClient';
import { AuthProvider } from '@/contexts/AuthContext';

interface DebatePageProps {
  params: Promise<{
    extId: string;
  }>;
}

interface GenerateMetadataProps {
  params: Promise<{
    extId: string;
  }>;
}

async function getDebateFromServer(extId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data: debates, error } = await supabase.rpc('get_unvoted_debates_unauth', {
    p_ext_id: extId
  });

  if (error) throw error;
  if (!debates || debates.length === 0) return null;

  return debates[0];
}

async function getHansardData(extId: string) {
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = process.env.VERCEL_URL || 'localhost:3000';
  
  const response = await fetch(
    `${protocol}://${host}/api/hansard/${extId}`,
    { next: { revalidate: 3600 } }
  );
  
  if (!response.ok) return null;
  return response.json();
}

export default async function DebatePage({ params }: DebatePageProps) {
  const resolvedParams = await params;
  const [rawDebate, hansardData] = await Promise.all([
    getDebateFromServer(resolvedParams.extId),
    getHansardData(resolvedParams.extId)
  ]);

  if (!rawDebate) {
    notFound();
  }

  return (
    <AuthProvider>
      <main className="container mx-auto py-8 px-4">
        <Suspense fallback={<div>Loading...</div>}>
          <ProcessDebateClient 
            rawDebate={rawDebate} 
            hansardData={hansardData}
          />
        </Suspense>
      </main>
    </AuthProvider>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: GenerateMetadataProps) {
  const resolvedParams = await params;
  const debate = await getDebateFromServer(resolvedParams.extId);
  
  if (!debate) {
    return {
      title: 'Debate Not Found',
    };
  }

  return {
    title: debate.ai_title || 'Debate',
    description: debate.ai_summary || '',
    openGraph: {
      title: debate.ai_title || 'Debate',
      description: debate.ai_summary || '',
      type: 'article',
      publishedTime: debate.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: debate.ai_title || 'Debate',
      description: debate.ai_summary || '',
    },
  };
} 