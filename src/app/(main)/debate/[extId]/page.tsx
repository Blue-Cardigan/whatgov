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
    // First, check if debate exists in database
    const rawDebate = await getDebateFromServer(extId);
    if (!rawDebate) {
      console.log(`Debate not found in database: ${extId}`);
      notFound();
    }

    // Then try to get Hansard data - don't fail if this errors
    let hansardData;
    try {
      hansardData = await HansardAPI.getDebateTranscript(extId);
    } catch (error) {
      console.error('Failed to fetch Hansard data:', error);
      // Don't return 404 - just continue without Hansard data
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
  } catch (error) {
    console.error('Error in DebatePage:', error);
    throw error; // Let Next.js handle the error
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
    title: debate.title || 'Debate',
    openGraph: {
      title: debate.title || 'Debate',
      description: debate.analysis.split(0, 100) || '',
      type: 'article',
      publishedTime: debate.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: debate.title || 'Debate',
      description: debate.analysis.split(0, 100) || '',
    },
  };
} 