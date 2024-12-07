import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, description, filters, keywords, userId, fileIds } = await request.json();

    // Verify the requesting user matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First, create the assistant record in pending state
    const { data: assistant, error: createError } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        name,
        description,
        filters,
        keywords,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Database error creating assistant:', createError);
      return NextResponse.json(
        { error: 'Failed to create assistant record', details: createError.message },
        { status: 500 }
      );
    }

    if (!assistant) {
      return NextResponse.json(
        { error: 'No assistant record created' },
        { status: 500 }
      );
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('assistants')
      .update({ status: 'processing' })
      .eq('id', assistant.id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating assistant status:', updateError);
    }

    try {
      // Create vector store with provided file IDs
      const vectorStore = await openai.beta.vectorStores.create({
        name: `${name}`,
        file_ids: fileIds
      });

      // Create the OpenAI assistant with the vector store
      const openaiAssistant = await openai.beta.assistants.create({
        name,
        description,
        instructions: `You are an expert parliamentary analyst specializing in ${description}. 
          Use the provided debate details to answer questions accurately and cite specific debates when possible.
          Always maintain a formal and professional tone appropriate for parliamentary discourse.` + 
          (keywords.length > 0 ? ` Pay special attention to discussions involving these keywords: ${keywords.join(', ')}.` : ''),
        model: "gpt-4o",
        tools: [{ type: "file_search" }],
        tool_resources: {
          "file_search": {
            "vector_store_ids": [vectorStore.id]
          }
        }
      });

      // Update the assistant with the vector store ID
      await openai.beta.assistants.update(openaiAssistant.id, {
        tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      });

      // Update the assistant record with success status
      const { error: finalUpdateError } = await supabase
        .from('assistants')
        .update({
          status: 'ready',
          vector_store_id: vectorStore.id,
          openai_assistant_id: openaiAssistant.id,
          file_ids: fileIds
        })
        .eq('id', assistant.id)
        .eq('user_id', user.id);

      if (finalUpdateError) {
        throw new Error(`Failed to update assistant status: ${finalUpdateError.message}`);
      }

      return NextResponse.json({ 
        assistant: {
          ...assistant,
          vector_store_id: vectorStore.id,
          openai_assistant_id: openaiAssistant.id
        }
      });

    } catch (error) {
      // Update the assistant record with failed status
      await supabase
        .from('assistants')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', assistant.id)
        .eq('user_id', user.id);

      throw error;
    }

  } catch (error) {
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create assistant',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 