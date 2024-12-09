import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AssistantQueryBuilder } from '@/lib/supabase/assistant';
import OpenAI from 'openai';

const openai = new OpenAI();

async function updateVectorStores() {
  const supabase = await createServerSupabaseClient();
  const queryBuilder = new AssistantQueryBuilder(supabase);

  // Fetch all active assistants
  const { data: assistants, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'ready')
    .eq('keep_updated', true);

  if (error) {
    console.error('Error fetching assistants:', error);
    return;
  }

  for (const assistant of assistants) {
    try {
      // Get matching debates for the assistant
      const matchingDebates = await queryBuilder.getMatchingDebates(assistant.filters);

      // Update the vector store with new debates
      if (matchingDebates.length > 0) {
        await openai.beta.vectorStores.fileBatches.createAndPoll(
          assistant.vector_store_id,
          { file_ids: matchingDebates.map((debate: { file_id: string }) => debate.file_id) }
        );
      }
    } catch (error) {
      console.error(`Error updating vector store for assistant ${assistant.id}:`, error);
    }
  }
}

updateVectorStores().catch(console.error); 