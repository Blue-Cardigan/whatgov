import createClient from './client';
import type { SavedSearch, SaveSearchParams } from '@/types/search';
import type { RealtimePostgresChangesPayload } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';

export async function saveSearch(
  params: SaveSearchParams, 
  toast: ReturnType<typeof useToast>['toast']
): Promise<SavedSearch> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Fetch the user's subscription to determine their tier
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    const isProfessional = subscriptionData?.plan === 'PROFESSIONAL';

    // Check for existing identical saved searches
    const { data: existingSearches, error: existingSearchError } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', user.id)
      .eq('query', params.query)
      .eq('search_type', params.searchType);

    if (existingSearchError) throw existingSearchError;

    // If an identical search exists, set is_active to false
    const shouldSetInactive = existingSearches && existingSearches.length > 0;

    // Prepare query state based on search type
    let queryState;
    
    if (params.searchType === 'hansard') {
      queryState = {
        house: params.queryState?.house,
        member: params.queryState?.member,
        party: params.queryState?.party,
        date_from: params.queryState?.date_from,
        date_to: params.queryState?.date_to,
      };
    }

    if (params.searchType === 'mp') {
      queryState = {
        mp: params.queryState?.mp,
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
          is_active: isProfessional && !shouldSetInactive,
          repeat_on
        });

      if (scheduleError) {
        await supabase
          .from('saved_searches')
          .delete()
          .eq('id', savedSearch.id);
        
        throw scheduleError;
      }
    }

    // Show toast notification
    toast({
      title: "Search saved",
      description: isProfessional
        ? "Your search has been saved and will repeat as scheduled."
        : "Create a professional account to activate repeating searches.",
      variant: "default"
    });

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

export async function updateSearchSchedule(
  searchId: string, 
  userId: string, 
  scheduleData: {
    is_active: boolean;
    repeat_on: { frequency: 'weekly'; dayOfWeek: number } | null;
  }
) {
  const supabase = createClient();

  try {
    // First, check if a schedule exists
    const { data: existingSchedule } = await supabase
      .from('saved_search_schedules')
      .select('id')
      .eq('search_id', searchId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSchedule) {
      // Update existing schedule
      const { error } = await supabase
        .from('saved_search_schedules')
        .update({
          is_active: scheduleData.is_active,
          repeat_on: scheduleData.repeat_on,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSchedule.id);

      if (error) throw error;
    } else {
      // Create new schedule
      const { error } = await supabase
        .from('saved_search_schedules')
        .insert({
          search_id: searchId,
          user_id: userId,
          is_active: scheduleData.is_active,
          repeat_on: scheduleData.repeat_on
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating search schedule:', error);
    throw error;
  }
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