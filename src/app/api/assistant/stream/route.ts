import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SupabaseClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add these type definitions at the top of the file
type DebateChunk = {
  debate_id: string;
  chunk_index: number;
  chunk_text: string;
  similarity?: number;
};

// Define the types
type MatchChunksResponse = {
  debate_id: string;
  chunk_index: number;
  similarity: number;
  chunk_text: string;
};

type Database = {
  public: {
    Functions: {
      match_chunks: {
        Returns: MatchChunksResponse[];
      };
    };
  };
};

// Add function to get embedding for query
async function getQueryEmbedding(query: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  return response.data[0].embedding;
}

async function getRelevantChunks(
  supabaseClient: SupabaseClient<Database>,
  embedding: number[],
  limit = 5
): Promise<MatchChunksResponse[]> {
    try {
      const formattedEmbedding = `[${embedding.toString()}]`;
      
      const { data: chunks, error } = await supabaseClient.rpc(
        'match_chunks',
        {
          query_embedding: formattedEmbedding,
          match_threshold: 0.2,
          match_count: limit
        }
      );

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      return chunks || [];
    } catch (error) {
      console.error('Error matching chunks:', error);
      throw error;
    }
}
  

export async function POST(request: Request) {
  const supabaseClient = await createServerSupabaseClient();
  
  // Check authentication
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  try {
    const { query, assistantId } = await request.json();

    if (!query) {
      return new Response('Query is required', { status: 400 });
    }

    // If no assistantId is provided, use the default assistant
    const assistantIDToUse = assistantId || process.env.DEFAULT_OPENAI_ASSISTANT_ID!;

    // Get embedding for query
    const embedding = await getQueryEmbedding(query);
    
    // Get relevant chunks
    const chunks = await getRelevantChunks(supabaseClient, embedding);

    // Check if chunks array is empty
    if (!chunks.length) {
      return new Response('No relevant content found', { status: 404 });
    }

    // Format chunks as context with the new bracket style
    const context = chunks.map((chunk: DebateChunk, index: number) => 
      `【${index + 1}】From debate ${chunk.debate_id}, chunk ${chunk.chunk_index}:\n${chunk.chunk_text}`
    ).join('\n\n');

    // Modify the query instructions to use the new bracket style
    const enhancedQuery = `Context information:\n${context}\n\nUser query: ${query}\n\nPlease answer the query using the provided context. Reference the sources using numbered citations in special brackets (e.g. 【1】, 【2】, etc.). Each citation should correspond to the numbered context items above.`;

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: enhancedQuery
    });

    const stream = new ReadableStream({
        async start(controller) {
          try {
            const runStream = await openai.beta.threads.runs.createAndStream(
              thread.id, { assistant_id: assistantIDToUse }
            );
      
            for await (const part of runStream) {
              if (part.event === "thread.message.delta") {
                const content = part.data.delta.content;
                if (content && content.length > 0) {
                  const firstContent = content[0];
                  if ('text' in firstContent) {
                    const textContent = firstContent.text?.value;
                    if (textContent) {
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
                if (part.data.content[0].type === "text") {
                  const { text } = part.data.content[0];
                  
                  // Send citations first
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'citations', 
                      content: chunks.map((chunk: DebateChunk, index: number) => ({
                        citation_index: index + 1,
                        debate_id: chunk.debate_id,
                        chunk_text: chunk.chunk_text
                      }))
                    }) + '\n'
                  ));

                  // Then send the final text
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'finalText', 
                      content: text.value 
                    }) + '\n'
                  ));
      
                  // Send debate references
                  controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                      type: 'debateRefs',
                      content: chunks.map((chunk: DebateChunk) => ({
                        debate_id: chunk.debate_id,
                        chunk_index: chunk.chunk_index
                      }))
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

    console.log("Stream created");
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