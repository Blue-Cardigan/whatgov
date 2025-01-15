import createClient from './client';
import type { RealtimePostgresChangesPayload } from '@/types/supabase';

export interface SavedDebate {
  id: string;
  user_id: string;
  debate_id: string;
  title: string;
  type: string;
  house: string;
  date: string;
  created_at: string;
  is_unread: boolean;
}

export async function isDebateSaved(debateId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from('saved_debates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('debate_id', debateId);

  if (error) {
    console.error('Error checking saved debate:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function saveDebate(debate: {
  ext_id: string;
  title: string;
  type: string;
  house: string;
  date: string;
}) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Check user's subscription status
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    const isProfessional = subscriptionData?.plan === 'PROFESSIONAL';

    const { data, error } = await supabase
      .from('saved_debates')
      .insert({
        user_id: user.id,
        debate_id: debate.ext_id,
        title: debate.title,
        type: debate.type,
        house: debate.house,
        date: debate.date,
        created_at: new Date().toISOString(),
        is_unread: true,
        is_active: isProfessional
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Debate already saved');
      }
      throw error;
    }

    return data;

  } catch (error) {
    console.error('Error saving debate:', error);
    throw error;
  }
}

export async function deleteDebate(debateId: string) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('saved_debates')
    .delete()
    .eq('user_id', user.id)
    .eq('debate_id', debateId);

  if (error) throw error;
}

export async function fetchSavedDebates(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('saved_debates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function markDebatesAsRead(debateIds: string[], userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_debates')
    .update({ is_unread: false })
    .in('id', debateIds)
    .eq('user_id', userId);

  if (error) throw error;
}

export function subscribeToDebateUpdates(userId: string, callbacks: {
  onUpdate?: (payload: RealtimePostgresChangesPayload<SavedDebate>) => void;
  onInsert?: (payload: RealtimePostgresChangesPayload<SavedDebate>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<SavedDebate>) => void;
}) {
  const supabase = createClient();

  return supabase
    .channel('saved_debates_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_debates',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && callbacks.onUpdate) {
          callbacks.onUpdate(payload as unknown as RealtimePostgresChangesPayload<SavedDebate>);
        } else if (payload.eventType === 'INSERT' && callbacks.onInsert) {
          callbacks.onInsert(payload as unknown as RealtimePostgresChangesPayload<SavedDebate>);
        } else if (payload.eventType === 'DELETE' && callbacks.onDelete) {
          callbacks.onDelete(payload as unknown as RealtimePostgresChangesPayload<SavedDebate>);
        }
      }
    )
    .subscribe();
} 