import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { ProcessDebateClient } from '@/components/debates/ProcessDebateClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { HansardAPI } from '@/lib/search-api';
import { SimpleFooter } from '@/components/layout/SimpleFooter';

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
  
  const { data: debate, error } = await supabase
    .from('debates_new')
    .select('*')
    .eq('ext_id', extId)
    .single();

  if (error) throw error;
  if (!debate) return null;

  return debate;
}

export default async function DebatePage({ params }: DebatePageProps) {
  const { extId } = await params;
  
  try {
    const [rawDebate, hansardData] = await Promise.all([
      getDebateFromServer(extId),
      HansardAPI.getDebateTranscript(extId)
    ]);

    if (!rawDebate) {
      notFound();
    }

    return (
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 container max-w-4xl mx-auto py-8 px-4">
            <Suspense fallback={<div>Loading...</div>}>
              <ProcessDebateClient 
                rawDebate={rawDebate} 
                hansardData={hansardData}
              />
            </Suspense>
          </div>
          <SimpleFooter />
        </div>
      </AuthProvider>
    );
  } catch {
    notFound();
  }
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