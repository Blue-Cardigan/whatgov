import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AssistantQueryBuilder } from '@/lib/supabase/assistant';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { promptTemplates } from '@/lib/assistant-prompts';

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { 
      assistantId,
      name,
      description,
      promptType,
      filters,
      keywords,
      fileIds,
      keepUpdated
    } = await request.json();

    // Get the existing assistant
    const queryBuilder = new AssistantQueryBuilder(supabase);
    const existingAssistant = await queryBuilder.getAssistant(assistantId);
    
    if (!existingAssistant) {
      return NextResponse.json(
        { success: false, error: 'Assistant not found' },
        { status: 404 }
      );
    }

    // Ensure we have a vector store ID
    if (!existingAssistant.vector_store_id) {
      return NextResponse.json(
        { success: false, error: 'Assistant vector store not found' },
        { status: 404 }
      );
    }

    // Get existing file IDs
    const existingFileIds = await queryBuilder.getAssistantFiles(assistantId);

    // Calculate file changes
    const filesToAdd = fileIds.filter((id: string) => !existingFileIds.includes(id));
    const filesToRemove = existingFileIds.filter(id => !fileIds.includes(id));

    // Update the vector store files using the assistant's vector store ID
    const vectorStoreId = existingAssistant.vector_store_id;
    
    // Remove files that are no longer needed
    for (const fileId of filesToRemove) {
      try {
        await openai.beta.vectorStores.files.del(vectorStoreId, fileId);
      } catch (error) {
        console.error(`Error removing file ${fileId}:`, error);
        // Continue with other files even if one fails
      }
    }

    // Add new files
    if (filesToAdd.length > 0) {
      try {
        await openai.beta.vectorStores.fileBatches.createAndPoll(
          vectorStoreId,
          { file_ids: filesToAdd }
        );
      } catch (error) {
        console.error('Error adding new files:', error);
        throw error;
      }
    }

    // Get the full prompt template
    const promptTemplate = promptTemplates[promptType as keyof typeof promptTemplates]
      .replace('${keywords.length > 0 ? `\\nPrioritize analysis of these key areas: ${keywords.join(\', \')}` : \'\'}', 
        keywords.length > 0 ? `\nPrioritize analysis of these key areas: ${keywords.join(', ')}` : '');

    // Update the assistant in OpenAI with the full prompt
    await openai.beta.assistants.update(
      existingAssistant.openai_assistant_id,
      {
        name,
        description,
        instructions: promptTemplate,
      }
    );

    // Update the assistant and file IDs in the database
    await Promise.all([
      queryBuilder.updateAssistant(assistantId, {
        name,
        description,
        prompt_type: promptType,
        keywords,
        filters,
        updated_at: new Date().toISOString(),
        keep_updated: keepUpdated
      }),
      queryBuilder.updateAssistantFiles(assistantId, fileIds)
    ]);

    return NextResponse.json({ 
      success: true,
      filesAdded: filesToAdd.length,
      filesRemoved: filesToRemove.length
    });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update assistant'
      },
      { status: 500 }
    );
  }
} 