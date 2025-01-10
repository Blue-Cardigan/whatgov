import { format } from 'date-fns';
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
  let eventDate: string | null = null;

  if (session.type === 'event' && session.event) {
    eventId = session.event.id;
    eventDate = session.event.startTime ? 
      format(new Date(session.event.startTime), 'yyyy-MM-dd') : null;
  } else if (session.type === 'oral-questions') {
    if (session.questions?.length === 1) {
      eventId = `oq-${session.department}-${session.time?.substantive}-q${session.questions[0].id}`;
    } else {
      eventId = `oq-${session.department}-${session.time?.substantive}`;
    }
    // For oral questions, construct the date from the substantive time
    if (session.time?.substantive) {
      const [hours, minutes] = session.time.substantive.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      eventDate = format(date, 'yyyy-MM-dd');
    }
  } else if (session.type === 'edm' && session.edm?.id) {
    eventId = `edm-${session.edm.id}`;
    if (session.edm.DateTabled) {
      eventDate = format(new Date(session.edm.DateTabled), 'yyyy-MM-dd');
    }
  }

  const { data, error } = await supabase
    .from('saved_calendar_items')
    .insert({
      user_id: user.id,
      event_id: eventId,
      event_data: session,
      date: eventDate,
      created_at: new Date().toISOString()
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