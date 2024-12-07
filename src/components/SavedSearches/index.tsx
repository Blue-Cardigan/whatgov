'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { AISearch } from '@/types/supabase';
import { SearchCard } from './SearchCard';
import { Clock } from 'lucide-react';

export function SavedSearches() {
  const [searches, setSearches] = useState<AISearch[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchSearches() {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('ai_searches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setSearches(data || []);
      } catch (error) {
        console.error('Failed to fetch searches:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSearches();
  }, [user, supabase]);

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Saved Searches</h1>
          <p className="text-muted-foreground">Please sign in to view your saved searches.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your saved searches...</p>
        </div>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">No searches yet</h1>
          <p className="text-muted-foreground">
            Your AI-powered searches will appear here once you start exploring parliamentary records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saved Searches</h1>
      <div className="space-y-6">
        {searches.map((search) => (
          <SearchCard key={search.id} search={search} />
        ))}
      </div>
    </div>
  );
} 