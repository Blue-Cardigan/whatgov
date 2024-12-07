import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { threadId, content } = await request.json();

    if (!threadId || !content) {
      return NextResponse.json(
        { error: 'ThreadId and content are required' }, 
        { status: 400 }
      );
    }

    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' }, 
      { status: 500 }
    );
  }
} 