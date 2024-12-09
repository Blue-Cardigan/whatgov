import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function DELETE(request: Request) {
  try {
    const { fileId } = await request.json();

    const result = await openai.beta.vectorStores.files.del(
      process.env.VECTOR_STORE_ID!,
      fileId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error removing file from vector store:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove file from vector store' },
      { status: 500 }
    );
  }
} 