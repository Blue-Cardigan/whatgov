import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getLastSevenDays } from '@/lib/utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantIDToUse = process.env.DEFAULT_OPENAI_ASSISTANT_ID!;

export async function POST(request: Request) {
  console.log('[Scheduler] Starting scheduled search processing');
  
  // Check API key
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey || apiKey !== process.env.SCHEDULER_API_KEY) {
    console.warn('[Scheduler] Unauthorized access attempt');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key instead of anon key
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    
    console.log('[Scheduler] Starting query with service role...');
    
    const { data: schedules, error: schedulesError } = await supabase
      .from('saved_search_schedules')
      .select(`
        id,
        is_active,
        last_run_at,
        next_run_at,
        user_id,
        saved_searches!inner (
          query,
          query_state,
          search_type,
          repeat_on
        )
      `)
      .eq('is_active', true)
      .or('next_run_at.lte.now()');

    console.log(`[Scheduler] Query conditions:`, {
      is_active: true,
      or: [
        'last_run_at IS NULL',
        `next_run_at <= ${now.toISOString()}`
      ]
    });

    if (schedulesError) {
      console.error('[Scheduler] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log(`[Scheduler] Query results:`, {
      count: schedules?.length || 0,
      schedules: schedules?.map(s => ({
        id: s.id,
        next_run_at: s.next_run_at,
        query: s.saved_searches.query
      }))
    });

    // 2. Process each schedule
    for (const schedule of schedules || []) {
      try {
        console.log(`[Scheduler] Processing schedule ${schedule.id} for search type "${schedule.saved_searches.search_type}"`);

        let response: string;
        let citations: string[] = [];

        let finalQuery = schedule.saved_searches.query;

        if (schedule.saved_searches.search_type === 'ai') {
          // Process AI search
          const thread = await openai.beta.threads.create();
          console.log(`[Scheduler] Created thread ${thread.id} for AI search`);

          finalQuery += `\n\nThe current date is ${new Date().toISOString().split('T')[0]}. Your response must only use the most recent debates, from these days: ${getLastSevenDays().join(', ')}`
          
          await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: finalQuery
          });

          const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantIDToUse
          });

          let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          while (runStatus.status !== 'completed') {
            if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
              throw new Error(`Run ${runStatus.status}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          }

          const messages = await openai.beta.threads.messages.list(thread.id);
          const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
          
          if (!assistantMessage?.content[0] || assistantMessage.content[0].type !== 'text') {
            throw new Error('Invalid assistant response');
          }

          response = assistantMessage.content[0].text.value;

          // Extract citations if any
          if ('annotations' in assistantMessage.content[0].text) {
            for (const annotation of assistantMessage.content[0].text.annotations) {
              if ('file_citation' in annotation) {
                const citedFile = await openai.files.retrieve(annotation.file_citation.file_id);
                citations.push(citedFile.filename);
              }
            }
          }

        } else if (schedule.saved_searches.search_type === 'hansard') {
          // Process Hansard search
          console.log(`[Scheduler] Processing Hansard search with query state:`, schedule.saved_searches.query_state);
          
          // Construct search params from query_state
          const searchParams = new URLSearchParams();
          if (schedule.saved_searches.query_state) {
            const { house, parts } = schedule.saved_searches.query_state;
            if (house) searchParams.set('house', house);
            if (parts) searchParams.set('searchTerm', parts.join(' '));
          } else {
            searchParams.set('searchTerm', schedule.saved_searches.query);
          }

          const url = `${process.env.NEXT_PUBLIC_URL}/api/hansard/search?${searchParams.toString()}`;
          console.log(`[Scheduler] Fetching Hansard data from: ${url}`);

          const hansardResponse = await fetch(url);
          if (!hansardResponse.ok) {
            throw new Error(`Hansard API error: ${hansardResponse.status}`);
          }

          const hansardData = await hansardResponse.json();
          response = JSON.stringify(hansardData);
        } else {
          throw new Error(`Unsupported search type: ${schedule.saved_searches.search_type}`);
        }

        // Store the response
        const { error: saveError } = await supabase
          .from('saved_searches')
          .insert({
            user_id: schedule.user_id,
            query: schedule.saved_searches.query,
            response,
            citations,
            query_state: schedule.saved_searches.query_state,
            search_type: schedule.saved_searches.search_type,
            repeat_on: schedule.saved_searches.repeat_on
          });

        if (saveError) {
          console.error(`[Scheduler] Error saving search:`, saveError);
          throw saveError;
        }

        // Update schedule timestamps
        const nextRunDate = calculateNextRunDate(schedule.saved_searches.repeat_on);
        const { error: updateError } = await supabase
          .from('saved_search_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunDate.toISOString()
          })
          .eq('id', schedule.id);

        if (updateError) throw updateError;

      } catch (error) {
        console.error(`[Scheduler] Error processing schedule ${schedule.id}:`, error);
        // Continue with next schedule even if one fails
      }
    }

    console.log('[Scheduler] Completed processing all schedules');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Scheduler] Error in scheduler:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500 }
    );
  }
}

function calculateNextRunDate(repeatOn: { frequency: string; dayOfWeek: number }): Date {
  const now = new Date();
  const nextDate = new Date(now);
  
  if (repeatOn.frequency === 'weekly') {
    // Convert from ISO day (1-7, Monday-Sunday) to JS day (0-6, Sunday-Saturday)
    const targetDay = repeatOn.dayOfWeek === 7 ? 0 : repeatOn.dayOfWeek;
    const currentDay = nextDate.getDay();
    
    // Calculate days until next occurrence
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0) {
      // If it's the same day but past 7am, schedule for next week
      if (nextDate.getHours() >= 7) {
        daysToAdd = 7;
      }
    }
    
    // Add the calculated days
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    // Set to 7am
    nextDate.setHours(7, 0, 0, 0);
  }
  
  return nextDate;
} 