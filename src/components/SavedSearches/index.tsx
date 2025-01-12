'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedSearch } from '@/types/search';
import type{ TimeSlot } from '@/types/calendar';
import { SearchCard } from './SearchCard';
import { Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CalendarCard } from './CalendarCard';

interface SavedCalendarItem {
  id: string;
  user_id: string;
  event_id: string;
  event_data: TimeSlot;
  created_at: string;
}

export function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [calendarItems, setCalendarItems] = useState<SavedCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        const [searchesResponse, calendarResponse] = await Promise.all([
          supabase
            .from('saved_searches')
            .select(`
              *,
              saved_search_schedules (
                id,
                is_active,
                repeat_on,
                next_run_at
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('saved_calendar_items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        setSearches(searchesResponse.data || []);
        setCalendarItems(calendarResponse.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, supabase]);

  useEffect(() => {
    return () => {
      if (!user?.id || searches.length === 0) return;

      const unreadSearchIds = searches
        .filter(search => search.is_unread)
        .map(search => search.id);

      if (unreadSearchIds.length === 0) return;

      supabase
        .from('saved_searches')
        .update({ is_unread: false })
        .in('id', unreadSearchIds)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to mark searches as read:', error);
          }
        });
    };
  }, [user, searches, supabase]);

  const handleDeleteSearch = async (searchId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .match({ 
          id: searchId,
          user_id: user.id
        });

      if (error) throw error;

      setSearches(prevSearches => 
        prevSearches.filter(search => search.id !== searchId)
      );

      toast({
        title: "Search deleted",
        description: "Your saved search has been removed",
      });
    } catch (error) {
      console.error('Failed to delete search:', error);
      toast({
        title: "Delete failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCalendarItem = async (itemId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('saved_calendar_items')
        .delete()
        .match({ 
          id: itemId,
          user_id: user.id
        });

      if (error) throw error;

      setCalendarItems(prevItems => 
        prevItems.filter(item => item.id !== itemId)
      );

      toast({
        title: "Event deleted",
        description: "Event removed from your saved items",
      });
    } catch (error) {
      console.error('Failed to delete calendar item:', error);
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
          <h1 className="text-2xl font-bold mb-4">Saved Items</h1>
          <p className="text-muted-foreground">Please sign in to view your saved items.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your saved items...</p>
        </div>
      </div>
    );
  }

  if (searches.length === 0 && calendarItems.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">No saved items</h1>
          <p className="text-muted-foreground">
            Your saved searches and calendar items will appear here.
          </p>
        </div>
      </div>
    );
  }

  // Split searches into AI and Hansard
  const aiSearches = searches.filter(s => s.search_type === 'ai');
  const hansardSearches = searches.filter(s => s.search_type === 'hansard');
  const unreadAiCount = aiSearches.filter(s => s.is_unread).length;
  const unreadHansardCount = hansardSearches.filter(s => s.is_unread).length;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saved Items</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Searches - Takes up 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">AI Research Assistant</h2>
            {unreadAiCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {unreadAiCount} new
              </span>
            )}
          </div>
          {aiSearches.map((search) => (
            <SearchCard 
              key={search.id} 
              search={search} 
              onDelete={() => handleDeleteSearch(search.id)}
            />
          ))}
        </div>

        {/* Right Column - Hansard Searches and Calendar Items */}
        <div className="space-y-8">
          {/* Calendar Items Section */}
          {calendarItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Saved Events</h2>
              {calendarItems.map((item) => (
                <CalendarCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDeleteCalendarItem(item.id)}
                />
              ))}
            </div>
          )}

          {/* Hansard Searches Section */}
          {hansardSearches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Hansard Search</h2>
                {unreadHansardCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {unreadHansardCount} new
                  </span>
                )}
              </div>
              {hansardSearches.map((search) => (
                <SearchCard 
                  key={search.id} 
                  search={search}
                  onDelete={() => handleDeleteSearch(search.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}