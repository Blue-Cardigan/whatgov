import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentVectorStore } from '../vector-store';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  try {
    const vectorStore = await getCurrentVectorStore();
    
    if (!vectorStore) {
      throw new Error('No vector store available for the current week');
    }

    const thread = await openai.beta.threads.create({
      metadata: {
        vector_store_id: vectorStore.id
      }
    });

    return NextResponse.json({ threadId: thread.id });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }
} 