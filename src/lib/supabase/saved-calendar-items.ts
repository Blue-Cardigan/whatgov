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

  // Get event details based on session type
  let eventDetails = {
    event_id: '',
    event_type: session.type,
    event_date: session.time?.substantive || new Date().toISOString(),
    event_title: '',
    event_location: '',
    event_category: '',
    event_house: ''
  };

  if (session.type === 'event' && session.event) {
    eventDetails = {
      ...eventDetails,
      event_id: session.event.id,
      event_title: session.event.title,
      event_location: session.event.location || '',
      event_category: session.event.category || '',
      event_house: session.event.house || ''
    };
  } else if (session.type === 'oral-questions') {
    eventDetails = {
      ...eventDetails,
      event_id: `oq-${session.department}-${session.time?.substantive}`,
      event_title: `${session.department} Oral Questions`,
      event_house: 'Commons'
    };
  }

  const { data, error } = await supabase
    .from('saved_calendar_items')
    .insert({
      user_id: user.id,
      ...eventDetails
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