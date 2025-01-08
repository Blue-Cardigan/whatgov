import createClient from './client';
import type { TimeSlot } from '@/types/calendar';

export async function isCalendarItemSaved(eventId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from('saved_calendar_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error checking saved calendar item:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function saveCalendarItem(session: TimeSlot) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let eventId = '';
  let title = '';
  let description = '';
  let eventDate = session.time?.substantive || new Date().toISOString();

  if (session.type === 'event' && session.event) {
    eventId = session.event.id;
    title = session.event.title;
    description = session.event.description || '';
  } else if (session.type === 'oral-questions') {
    eventId = `oq-${session.department}-${session.time?.substantive}`;
    title = `${session.department} Oral Questions`;
    description = session.questions?.map(q => q.text).join('\n') || '';
  } else if (session.type === 'edm') {
    eventId = `edm-${session.edm?.id}`;
    title = session.edm?.Title || '';
    description = session.edm?.Text || '';
  }

  const { data, error } = await supabase
    .from('saved_calendar_items')
    .insert({
      user_id: user.id,
      event_id: eventId,
      title,
      description,
      event_type: session.type,
      event_date: eventDate
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('Event already saved');
    }
    throw error;
  }

  return data;
}

export async function deleteCalendarItem(eventId: string) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('saved_calendar_items')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', eventId);

  if (error) throw error;
} 