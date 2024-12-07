import { StreamResponse } from '@/types/assistant';

export async function createThread() {
  try {
    const response = await fetch('/api/assistant/thread', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to create thread');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

export async function addMessageToThread(threadId: string, content: string) {
  try {
    const response = await fetch('/api/assistant/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadId, content }),
    });

    if (!response.ok) {
      throw new Error('Failed to add message to thread');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw error;
  }
}

export async function streamAssistantResponse(query: string): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const response = await fetch('/api/assistant/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Failed to stream assistant response');
    }

    return response.body;
  } catch (error) {
    console.error('Error streaming assistant response:', error);
    throw error;
  }
}

// Helper function to parse streaming response
export function parseStreamingResponse(chunk: string): {
  type: 'text' | 'finalText' | 'citations' | 'error';
  content?: string | string[];
} {
  try {
    const data = JSON.parse(chunk);
    return {
      type: data.type,
      content: data.content,
    };
  } catch (error) {
    console.error('Error parsing streaming response:', error);
    return {
      type: 'error',
      content: 'Failed to parse response',
    };
  }
}

// Helper function to process citations
export function processCitations(text: string, citations: string[]): {
  processedText: string;
  citationLinks: { index: number; url: string }[];
} {
  const citationLinks = citations.map((citation, index) => {
    const match = citation.match(/\[\d+\]\s+(.+?)\.txt$/);
    if (!match) return { index, url: '' };
    const filename = match[1];
    return { index, url: `/debate/${filename}` };
  });

  return {
    processedText: text,
    citationLinks: citationLinks.filter(link => link.url !== ''),
  };
}