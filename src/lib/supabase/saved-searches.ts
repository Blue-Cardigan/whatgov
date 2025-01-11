import createClient from './client';
import type { SavedSearch, SaveSearchParams } from '@/types/search';

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