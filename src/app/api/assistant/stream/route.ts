import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { query, useRecentFiles } = await request.json();
    console.log('[Assistant Stream] Starting with query:', query);
    console.log('[Assistant Stream] Using recent files:', useRecentFiles);

    // Get the weekly assistant ID if useRecentFiles is true
    let assistantId = process.env.DEFAULT_OPENAI_ASSISTANT_ID!;

    if (useRecentFiles) {
      // Get current date
      const currentDate = new Date();
      // Get Monday of current week (0 = Sunday, 1 = Monday, etc)
      const diff = currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1);
      const monday = new Date(currentDate.setDate(diff));
      const mondayString = monday.toISOString().split('T')[0];

      const supabase = await createServerSupabaseClient();
      const { data: vectorStore, error } = await supabase
        .from('vector_stores')
        .select('assistant_id')
        .eq('store_name', `Weekly Debates ${mondayString}`)
        .single();

      if (error) {
        console.error('[Assistant Stream] Error fetching weekly assistant:', error);
      } else if (vectorStore?.assistant_id) {
        console.log('[Assistant Stream] Using weekly assistant:', vectorStore.assistant_id);
        assistantId = vectorStore.assistant_id;
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const thread = await openai.beta.threads.create();
          console.log('[Assistant Stream] Created thread:', thread.id);

          await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: query // Using original query without modification
          });

          const runStream = await openai.beta.threads.runs.createAndStream(
            thread.id,
            { assistant_id: assistantId }
          );

          let citations: Array<{ citation_index: number; debate_id: string }> = [];
          let processedText = '';
          let hasCompletedMessage = false;

          for await (const part of runStream) {
            if (part.event === "thread.message.delta") {
              const content = part.data.delta.content;
              if (content && content.length > 0) {
                const firstContent = content[0];
                if ('text' in firstContent) {
                  const textContent = firstContent.text?.value;
                  if (textContent && !hasCompletedMessage) {
                    processedText += textContent;
                    controller.enqueue(encoder.encode(
                      JSON.stringify({ 
                        type: 'text', 
                        content: textContent 
                      }) + '\n'
                    ));
                  }
                }
              }
            } else if (part.event === "thread.message.completed") {
              hasCompletedMessage = true;
              if (part.data.content[0].type === "text") {
                const { text } = part.data.content[0];
                const { annotations = [] } = text;
                let finalText = text.value;
                console.log('[Assistant Stream] Completed text:', finalText);

                // Reset citations array for final version
                citations = [];

                // Process citations and replace annotation text with indices
                for (let i = 0; i < annotations.length; i++) {
                  const annotation = annotations[i];
                  if ('file_citation' in annotation) {
                    finalText = finalText.replace(annotation.text, `【${i + 1}】`);

                    const file = await openai.files.retrieve(annotation.file_citation.file_id);
                    const debate_id = file.filename
                      .replace(/^debate-/, '')
                      .replace(/\.txt$/, '');

                    citations.push({
                      citation_index: i + 1,
                      debate_id,
                    });
                  }
                }

                // Send the final processed text with citation indices
                controller.enqueue(encoder.encode(
                  JSON.stringify({ 
                    type: 'finalText',
                    content: {
                      text: finalText,
                      isFinal: true
                    }
                  }) + '\n'
                ));

                // Send final citations
                controller.enqueue(encoder.encode(
                  JSON.stringify({ 
                    type: 'citations', 
                    content: citations
                  }) + '\n'
                ));
                console.log('[Assistant Stream] Sent citations:', citations);
              }
            }
          }
          
          controller.close();
        } catch (error) {
          console.error("Error in stream:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in streaming route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500 }
    );
  }
}