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

  if (type === 'bill' && identifier.id) {
    query.eq('query_state->billId', identifier.id);
  } else if (type === 'edm' && identifier.id) {
    query.eq('query_state->edmId', identifier.id);
  } else if (type === 'question' && identifier.title && identifier.date && identifier.minister) {
    query.contains('query_state', {
      question_text: identifier.title,
      answer_date: identifier.date,
      answering_minister: identifier.minister
    });
  }

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

  if (params.searchType === 'bill') {
    existingQuery = existingQuery.eq('query_state->billId', params.queryState.billId);
  } else if (params.searchType === 'edm') {
    existingQuery = existingQuery.eq('query_state->edmId', params.queryState.edmId);
  } else if (params.searchType === 'question') {
    existingQuery = existingQuery
      .eq('query_state->question_text', params.queryState.questionText)
      .eq('query_state->answer_date', params.queryState.answerDate)
      .eq('query_state->answering_minister', params.queryState.answeringMinister);
  }

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