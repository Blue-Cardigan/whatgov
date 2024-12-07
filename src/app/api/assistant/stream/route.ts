import OpenAI from 'openai';
import { getCurrentVectorStore } from '../vector-store';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const { query, assistantId } = await request.json();

    if (!query) {
      return new Response('Query is required', { status: 400 });
    }
    console.log('assistantId', assistantId);

    // If no assistantId is provided, use the default assistant
    const assistantIDToUse = assistantId || process.env.OPENAI_ASSISTANT_ID!;
    console.log('assistantIDToUse', assistantIDToUse);

    // If using a custom assistant, verify it exists and belongs to the user
    if (assistantId) {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: query
      });

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const runStream = await openai.beta.threads.runs.createAndStream(
              thread.id, { assistant_id: assistantIDToUse }
            );

            let currentText = '';
            let citations: string[] = [];

            for await (const part of runStream) {
              if (part.event === "thread.message.delta") {
                const content = part.data.delta.content;
                if (content && content.length > 0) {
                  const textContent = content[0].text?.value;
                  if (textContent) {
                    currentText += textContent;
                    controller.enqueue(encoder.encode(
                      JSON.stringify({ 
                        type: 'text', 
                        content: textContent 
                      }) + '\n'
                    ));
                  }
                }
              } else if (part.event === "thread.message.completed") {
                if (part.data.content[0].type === "text") {
                  const { text } = part.data.content[0];
                  const { annotations } = text;
                  citations = [];

                  let processedText = text.value;
                  for (let i = 0; i < annotations.length; i++) {
                    const annotation = annotations[i];
                    processedText = processedText.replace(annotation.text, `[${i + 1}]`);
                    
                    const { file_citation } = annotation;
                    if (file_citation) {
                      const citedFile = await openai.files.retrieve(file_citation.file_id);
                      citations.push(`[${i + 1}] ${citedFile.filename}`);
                    }
                  }

                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'finalText', 
                      content: processedText 
                    }) + '\n'
                  ));

                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'citations', 
                      content: citations 
                    }) + '\n'
                  ));
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

    } else {
      // Use default assistant logic
      const vectorStore = await getCurrentVectorStore();
      if (!vectorStore) {
        throw new Error('No vector store available for the current week');
      }

      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: query
      });

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const runStream = await openai.beta.threads.runs.createAndStream(
              thread.id,
              {
                assistant_id: process.env.OPENAI_ASSISTANT_ID!,
                tools: [{"type": "file_search"}],
                tool_resources: {
                  "file_search": {
                    "vector_store_ids": [vectorStore.id]
                  }
                }
              }
            );

            let currentText = '';
            let citations: string[] = [];

            for await (const part of runStream) {
              if (part.event === "thread.message.delta") {
                const content = part.data.delta.content;
                if (content && content.length > 0) {
                  const textContent = content[0].text?.value;
                  if (textContent) {
                    currentText += textContent;
                    controller.enqueue(encoder.encode(
                      JSON.stringify({ 
                        type: 'text', 
                        content: textContent 
                      }) + '\n'
                    ));
                  }
                }
              } else if (part.event === "thread.message.completed") {
                if (part.data.content[0].type === "text") {
                  const { text } = part.data.content[0];
                  const { annotations } = text;
                  citations = [];

                  let processedText = text.value;
                  for (let i = 0; i < annotations.length; i++) {
                    const annotation = annotations[i];
                    processedText = processedText.replace(annotation.text, `[${i + 1}]`);
                    
                    const { file_citation } = annotation;
                    if (file_citation) {
                      const citedFile = await openai.files.retrieve(file_citation.file_id);
                      citations.push(`[${i + 1}] ${citedFile.filename}`);
                    }
                  }

                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'finalText', 
                      content: processedText 
                    }) + '\n'
                  ));

                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'citations', 
                      content: citations 
                    }) + '\n'
                  ));
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
    }

  } catch (error) {
    console.error('Error in streaming route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500 }
    );
  }
} 