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
        startDate: params.queryState?.startDate || new Date('2024-07-04').toISOString(),
        endDate: params.queryState?.endDate || new Date().toISOString(),
        parts: [params.query] // Store original query for exact matching
      };
    }

    // Insert the saved search first
    const { data: savedSearch, error: searchError } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        query: params.query,
        response: params.response,
        citations: params.citations || [],
        query_state: queryState ? queryState : null,
        search_type: params.searchType
      })
      .select()
      .single();

    if (searchError) throw searchError;
    if (!savedSearch) throw new Error('Failed to create saved search');

    // If repeat is enabled, create the schedule
    if (params.repeat_on) {
      const { error: scheduleError } = await supabase
        .from('saved_search_schedules')
        .insert({
          search_id: savedSearch.id,
          user_id: user.id,
          is_active: true,
          repeat_on: JSON.stringify(params.repeat_on)
          // next_run_at will be set automatically by the trigger
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