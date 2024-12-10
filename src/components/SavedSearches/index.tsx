'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedSearch } from '@/types/search';
import { SearchCard } from './SearchCard';
import { Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchSearches() {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('saved_searches')
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

  const handleDelete = async (searchId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .match({ 
          id: searchId,
          user_id: user.id // Ensure we only delete user's own searches
        });

      if (error) {
        throw error;
      }

      // Update local state to remove the deleted search
      setSearches(prevSearches => 
        prevSearches.filter(search => search.id !== searchId)
      );

      // Show success toast
      toast({
        title: "Search deleted",
        description: "Your saved search has been removed",
      });
    } catch (error) {
      console.error('Failed to delete search:', error);
      // Show error toast
      toast({
        title: "Delete failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

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

  // Split searches into AI and Hansard
  const aiSearches = searches.filter(s => s.search_type === 'ai');
  const hansardSearches = searches.filter(s => s.search_type === 'hansard');

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saved Searches</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Searches - Takes up 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold mb-4">AI Research Assistant</h2>
          {aiSearches.map((search) => (
            <SearchCard 
              key={search.id} 
              search={search} 
              onDelete={() => handleDelete(search.id)}
            />
          ))}
        </div>

        {/* Hansard Searches - Takes up 1 column */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Hansard Search</h2>
          {hansardSearches.map((search) => (
            <SearchCard 
              key={search.id} 
              search={search}
              onDelete={() => handleDelete(search.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}