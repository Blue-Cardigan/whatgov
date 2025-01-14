import createClient from './client';
import type { SavedSearch, SaveSearchParams } from '@/types/search';
import type { RealtimePostgresChangesPayload } from '@/types/supabase';

export async function saveSearch(params: SaveSearchParams): Promise<SavedSearch> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Prepare query state based on search type
    let queryState;
    
    if (params.searchType === 'hansard') {
      queryState = {
        searchTerm: params.query,
        house: params.queryState?.house,
        parts: [params.query] // Store original query for exact matching
      };
    }

    // Ensure repeat_on is properly formatted as a JSONB object
    const repeat_on = params.repeat_on ? {
      frequency: params.repeat_on.frequency,
      dayOfWeek: params.repeat_on.dayOfWeek
    } : null;

    // Insert the saved search first
    const { data: savedSearch, error: searchError } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        query: params.query,
        response: params.response,
        citations: params.citations || [],
        query_state: queryState || null,
        search_type: params.searchType,
      })
      .select()
      .single();

    if (searchError) throw searchError;
    if (!savedSearch) throw new Error('Failed to create saved search');

    // If repeat is enabled, create the schedule with properly formatted JSONB
    if (repeat_on) {
      const { error: scheduleError } = await supabase
        .from('saved_search_schedules')
        .insert({
          search_id: savedSearch.id,
          user_id: user.id,
          is_active: true,
          repeat_on // This will be properly stored as JSONB
        });

      if (scheduleError) {
        // If schedule creation fails, delete the saved search
        await supabase
          .from('saved_searches')
          .delete()
          .eq('id', savedSearch.id);
        
        throw scheduleError;
      }
    }

    return savedSearch;

  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
} 

export async function fetchSavedSearches(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteSavedSearch(searchId: string, userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .match({ 
      id: searchId,
      user_id: userId
    });

  if (error) throw error;
}

export async function markSearchesAsRead(searchIds: string[], userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_searches')
    .update({ is_unread: false, has_changed: false })
    .in('id', searchIds)
    .eq('user_id', userId);

  if (error) throw error;
}

export function subscribeToSearchUpdates(userId: string, callbacks: {
  onUpdate?: (payload: RealtimePostgresChangesPayload<SavedSearch>) => void;
  onInsert?: (payload: RealtimePostgresChangesPayload<SavedSearch>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<SavedSearch>) => void;
}) {
  const supabase = createClient();

  return supabase
    .channel('saved_searches_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_searches',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && callbacks.onUpdate) {
          callbacks.onUpdate(payload as unknown as RealtimePostgresChangesPayload<SavedSearch>);
        } else if (payload.eventType === 'INSERT' && callbacks.onInsert) {
          callbacks.onInsert(payload as unknown as RealtimePostgresChangesPayload<SavedSearch>);
        } else if (payload.eventType === 'DELETE' && callbacks.onDelete) {
          callbacks.onDelete(payload as unknown as RealtimePostgresChangesPayload<SavedSearch>);
        }
      }
    )
    .subscribe();
} 