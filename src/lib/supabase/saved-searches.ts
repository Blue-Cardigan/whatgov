import createClient from './client';
import type { SavedSearch, SaveSearchParams } from '@/types/search';
import type { TimeSlot } from '@/types/calendar';

interface QuestionIdentifier {
  text: string;
  date: string;
  minister: string;
}

// Update function to check if a question is saved
export async function isQuestionSaved(question: QuestionIdentifier): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Use containment operator @> for JSONB query
  const { count, error } = await supabase
    .from('saved_searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('search_type', 'question')
    .contains('query_state', {
      question_text: question.text,
      answer_date: question.date,
      answering_minister: question.minister
    });

  if (error) {
    console.error('Error checking saved question:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

// Update saveSearch function
export async function saveSearch(params: SaveSearchParams): Promise<SavedSearch> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if question is already saved using the same fields
  const { count: existingCount } = await supabase
    .from('saved_searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('search_type', 'question')
    .eq('query_state->question_text', params.queryState.questionText)
    .eq('query_state->answer_date', params.queryState.answerDate)
    .eq('query_state->answering_minister', params.queryState.answeringMinister);

  if (existingCount && existingCount > 0) {
    throw new Error('Question already saved');
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      query: params.query,
      response: '', // Leave empty as requested
      citations: params.citations,
      query_state: {
        question_text: params.queryState.questionText,
        answer_date: params.queryState.answerDate,
        answering_minister: params.queryState.answeringMinister,
        department: params.queryState.department,
        deadline: params.queryState.deadline,
        question_id: params.queryState.questionId,
        uin: params.queryState.uin
      },
      search_type: params.searchType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
} 