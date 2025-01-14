import { format } from 'date-fns';
import createClient from './client';
import type { TimeSlot } from '@/types/calendar';
import type { RealtimePostgresChangesPayload, SavedCalendarItem } from '@/types/supabase';

export async function isCalendarItemSaved(eventId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // If this is a question ID, also check for the parent session
  let queryEventId = eventId;
  if (eventId.includes('-q')) {
    // Extract the session ID from the question ID
    queryEventId = eventId.split('-q')[0];
  }

  const { count, error } = await supabase
    .from('saved_calendar_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_id', queryEventId);

  if (error) {
    console.error('Error checking saved calendar item:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function saveCalendarItem(session: TimeSlot, questionId?: number) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let eventId = '';
  let eventDate: string | null = null;
  let eventData: Partial<TimeSlot> = {};

  if (session.type === 'oral-questions') {
    const questionDate = session.questions?.[0]?.answeringWhen;
    if (!questionDate) throw new Error('Invalid question data');

    // If saving individual question, use question-specific ID
    if (questionId) {
      eventId = `oq-${session.departmentId}-${format(new Date(questionDate), 'yyyy-MM-dd')}-q${questionId}`;
      // Filter to only include the specific question
      const question = session.questions?.find(q => q.id === questionId);
      if (!question) throw new Error('Question not found');
      
      eventData = {
        type: 'oral-questions',
        department: session.department,
        departmentId: session.departmentId,
        ministerTitle: session.ministerTitle,
        questions: [{
          id: question.id,
          UIN: question.UIN,
          text: question.text,
          questionType: question.questionType,
          AnsweringBodyId: question.AnsweringBodyId,
          answeringWhen: question.answeringWhen,
          askingMembers: question.askingMembers
        }]
      };
    } else {
      // Saving whole session - only store first 3 questions
      console.log('Saving whole session', session);
      eventId = `oq-${session.departmentId}-${format(new Date(questionDate), 'yyyy-MM-dd')}`;
      eventData = {
        type: 'oral-questions',
        department: session.department,
        departmentId: session.departmentId,
        ministerTitle: session.ministerTitle,
        questions: session.questions?.slice(0, 3).map(q => ({
          id: q.id,
          UIN: q.UIN,
          text: q.text,
          questionType: q.questionType,
          AnsweringBodyId: q.AnsweringBodyId,
          answeringWhen: q.answeringWhen,
          askingMembers: q.askingMembers
        }))
      };
    }
    eventDate = format(new Date(questionDate), 'yyyy-MM-dd');
  } else if (session.type === 'event' && session.event) {
    // Normalize the event type to a consistent format
    const eventType = session.event.type?.toLowerCase().trim()
      .replace('debate', '')
      .replace(/\s+/g, '-')
      .trim();
    
    eventId = `${eventType}-${session.event.id}`;
    // This will create IDs like "westminster-hall-50140"
    
    eventDate = session.event.startTime ? 
      format(new Date(session.event.startTime), 'yyyy-MM-dd') : null;
    eventData = {
      type: 'event',
      event: {
        id: session.event.id,
        title: session.event.title,
        description: session.event.description,
        startTime: session.event.startTime,
        category: session.event.category,
        type: session.event.type
      }
    };
  } else if (session.type === 'edm' && session.edm?.id) {
    eventId = `edm-${session.edm.id}`;
    eventDate = session.edm.dateTabled ? 
      format(new Date(session.edm.dateTabled), 'yyyy-MM-dd') : null;
    eventData = {
      type: 'edm',
      edm: {
        id: session.edm.id,
        title: session.edm.title,
        text: session.edm.text,
        dateTabled: session.edm.dateTabled,
        primarySponsor: {
          name: session.edm.primarySponsor.name,
          party: session.edm.primarySponsor.party
        }
      }
    };
  }

  // Remove any undefined or null values
  eventData = JSON.parse(JSON.stringify(eventData));

  const { data, error } = await supabase
    .from('saved_calendar_items')
    .insert({
      user_id: user.id,
      event_id: eventId,
      event_data: eventData,
      date: eventDate,
      created_at: new Date().toISOString(),
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

  // If this is a question ID, we need to delete the parent session
  let deleteEventId = eventId;
  if (eventId.includes('-q')) {
    // Extract the session ID from the question ID
    deleteEventId = eventId.split('-q')[0];
  }

  const { error } = await supabase
    .from('saved_calendar_items')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', deleteEventId);

  if (error) throw error;
}

export async function getSavedCalendarItems(startDate: Date, endDate: Date): Promise<string[]> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_calendar_items')
    .select('event_id')
    .eq('user_id', user.id)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (error) {
    console.error('Error fetching saved calendar items:', error);
    return [];
  }

  return data.map(item => item.event_id);
}

export async function fetchSavedCalendarItems(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('saved_calendar_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function markCalendarItemsAsRead(itemIds: string[], userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_calendar_items')
    .update({ is_unread: false })
    .in('id', itemIds)
    .eq('user_id', userId);

  if (error) throw error;
}

export function subscribeToCalendarUpdates(userId: string, callbacks: {
  onUpdate?: (payload: RealtimePostgresChangesPayload<SavedCalendarItem>) => void;
  onInsert?: (payload: RealtimePostgresChangesPayload<SavedCalendarItem>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<SavedCalendarItem>) => void;
}) {
  const supabase = createClient();

  return supabase
    .channel('saved_calendar_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_calendar_items',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && callbacks.onUpdate) {
          callbacks.onUpdate(payload as unknown as RealtimePostgresChangesPayload<SavedCalendarItem>);
        } else if (payload.eventType === 'INSERT' && callbacks.onInsert) {
          callbacks.onInsert(payload as unknown as RealtimePostgresChangesPayload<SavedCalendarItem>);
        } else if (payload.eventType === 'DELETE' && callbacks.onDelete) {
          callbacks.onDelete(payload as unknown as RealtimePostgresChangesPayload<SavedCalendarItem>);
        }
      }
    )
    .subscribe();
} 