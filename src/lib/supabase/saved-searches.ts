import createClient from './client';
import type { SavedSearch, SaveSearchParams } from '@/types/search';

// Add type checking functions
export async function isItemSaved(
  type: 'bill' | 'edm' | 'question',
  identifier: { 
    id?: number;
    title?: string;
    date?: string;
    minister?: string;
  }
): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const query = supabase
    .from('saved_searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('search_type', type);

  const { count, error } = await query;

  if (error) {
    console.error('Error checking saved item:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

// Update saveSearch to handle bills and EDMs
export async function saveSearch(params: SaveSearchParams): Promise<SavedSearch> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if item is already saved
  let existingQuery = supabase
    .from('saved_searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('search_type', params.searchType);
    
  const { count: existingCount } = await existingQuery;

  if (existingCount && existingCount > 0) {
    throw new Error('Item already saved');
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      query: params.query,
      response: params.response,
      citations: params.citations,
      query_state: params.queryState,
      search_type: params.searchType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
} 