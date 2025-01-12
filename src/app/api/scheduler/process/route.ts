import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getLastSevenDays } from '@/lib/utils';
import { SearchResponse } from '@/types/search';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const defaultAssistantID = process.env.DEFAULT_OPENAI_ASSISTANT_ID!;

type SavedSearch = {
  query: string;
  query_state: {
    house?: string;
    parts?: string[];
  } | null;
  search_type: 'ai' | 'hansard' | 'calendar';
}

type Schedule = {
  id: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  user_id: string;
  repeat_on: {
    frequency: string;
    dayOfWeek: number;
  };
  saved_searches: SavedSearch;
}

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
    // Get search type from request body
    const body = await request.json().catch(() => ({}));
    const searchType = body.searchType as 'ai' | 'hansard' | undefined;

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
    
    const query = supabase
      .from('saved_search_schedules')
      .select(`
        id,
        is_active,
        last_run_at,
        next_run_at,
        user_id,
        repeat_on,
        saved_searches!inner (
          query,
          query_state,
          search_type
        )
      `)
      .eq('is_active', true)
      .or('next_run_at.lte.now()');

    // Add search type filter if specified
    if (searchType) {
      query.eq('saved_searches.search_type', searchType);
      console.log(`[Scheduler] Filtering for search type: ${searchType}`);
    }

    const { data: schedules, error: schedulesError } = await query as { data: Schedule[] | null, error: any };

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
        let hasChanged: boolean = false;
        let finalQuery = schedule.saved_searches.query;

        if (schedule.saved_searches.search_type === 'ai') {
          // Get current week's assistant ID
          const currentDate = new Date();
          const diff = currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1);
          const monday = new Date(currentDate.setDate(diff));
          const mondayString = monday.toISOString().split('T')[0];

          let assistantId = defaultAssistantID; // Default fallback

          const { data: vectorStore, error: vectorStoreError } = await supabase
            .from('vector_stores')
            .select('assistant_id')
            .eq('store_name', `Weekly Debates ${mondayString}`)
            .single();

          if (vectorStoreError) {
            console.error('[Scheduler] Error fetching weekly assistant:', vectorStoreError);
          } else if (vectorStore?.assistant_id) {
            console.log('[Scheduler] Using weekly assistant:', vectorStore.assistant_id);
            assistantId = vectorStore.assistant_id;
          }

          // Process AI search with selected assistant
          const thread = await openai.beta.threads.create();
          console.log(`[Scheduler] Created thread ${thread.id} for AI search using assistant ${assistantId}`);

          finalQuery += `\n\nThe current date is ${new Date().toISOString().split('T')[0]}. Your response must only use the most recent debates, from these days: ${getLastSevenDays().join(', ')}`
          
          await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: finalQuery
          });

          const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId
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

          hasChanged = false;
        } else if (schedule.saved_searches.search_type === 'hansard') {
          console.log(`[Scheduler] Processing Hansard search with query:`, schedule.saved_searches.query);
          
          // For Hansard searches, use the stored query directly as it may contain advanced search directives
          const searchParams = new URLSearchParams();
          searchParams.set('searchTerm', schedule.saved_searches.query);
          
          // Add house filter if present
          if (schedule.saved_searches.query_state?.house) {
            searchParams.set('house', schedule.saved_searches.query_state.house);
          }
          
          const url = `${process.env.NEXT_PUBLIC_URL}/api/hansard/search?${searchParams.toString()}`;
          console.log(`[Scheduler] Fetching Hansard data from: ${url}`);

          const hansardResponse = await fetch(url);
          if (!hansardResponse.ok) {
            throw new Error(`Hansard API error: ${hansardResponse.status}`);
          }

          const hansardData = await hansardResponse.json() as SearchResponse;
          console.log(`[Scheduler] Hansard data:`, hansardData);

          // Get the first result from any available result type, prioritizing Contributions
          const firstResult = 
            hansardData.Contributions?.[0] || 
            hansardData.WrittenStatements?.[0] || 
            hansardData.WrittenAnswers?.[0] || 
            hansardData.Corrections?.[0] || 
            null;

          // Format the response to match SaveSearchButton format
          const formattedResponse = {
            summary: {
              TotalMembers: hansardData.TotalMembers || 0,
              TotalContributions: hansardData.TotalContributions || 0,
              TotalWrittenStatements: hansardData.TotalWrittenStatements || 0,
              TotalWrittenAnswers: hansardData.TotalWrittenAnswers || 0,
              TotalCorrections: hansardData.TotalCorrections || 0,
              TotalPetitions: hansardData.TotalPetitions || 0,
              TotalDebates: hansardData.TotalDebates || 0,
              TotalCommittees: hansardData.TotalCommittees || 0,
              TotalDivisions: hansardData.TotalDivisions || 0
            },
            searchTerms: hansardData.SearchTerms || [],
            firstResult,
            date: todayDate
          };

          // Get the last stored result for comparison
          const { data: lastSearch, error: lastSearchError } = await supabase
            .from('saved_searches')
            .select('response')
            .eq('user_id', schedule.user_id)
            .eq('query', schedule.saved_searches.query)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastSearchError) {
            console.error('[Scheduler] Error fetching last search:', lastSearchError);
          }

          // Parse the last search response and compare first results
          const lastFirstResult = lastSearch ? JSON.parse(lastSearch.response).firstResult : null;
          hasChanged = JSON.stringify(firstResult) !== JSON.stringify(lastFirstResult);

          response = JSON.stringify(formattedResponse);
          citations = firstResult ? [firstResult.ContributionExtId] : [];
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
            has_changed: hasChanged
          });

        if (saveError) {
          console.error(`[Scheduler] Error saving search:`, saveError);
          throw saveError;
        }

        // Update schedule timestamps
        const nextRunDate = calculateNextRunDate(schedule.repeat_on);
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