import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { fileIds } = await request.json();

    const vectorStore = await openai.beta.vectorStores.fileBatches.createAndPoll(
      process.env.VECTOR_STORE_ID!,
      { file_ids: fileIds }
    );

    return NextResponse.json({ success: true, data: vectorStore });
  } catch (error) {
    console.error('Error adding files to vector store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add files to vector store' },
      { status: 500 }
    );
  }
} 