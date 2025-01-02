import createClient from './client';
import type { SavedSearch } from '@/types/search';

export async function saveSearch(params: {
  query: string;
  response: string;
  citations: string[];
  queryState?: any;
  searchType: 'ai' | 'hansard' | 'mp';
}): Promise<SavedSearch> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id, // Explicitly set the user_id
      query: params.query,
      response: params.response,
      citations: params.citations,
      query_state: params.queryState,
      search_type: params.searchType
    })
    .select()
    .single();

  if (error) throw error;
  return data;
} 