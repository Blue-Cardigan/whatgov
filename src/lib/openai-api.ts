import { Citation } from "@/types/search";

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

// Add this type definition
type StreamingResponseContent = string | Citation[] | { [key: string]: string }[];

export function parseStreamingResponse(chunk: string): {
  type: 'text' | 'finalText' | 'citations' | 'debateRefs' | 'error';
  content: StreamingResponseContent;
} {
  try {
    // Remove the 'data: ' prefix if it exists
    const jsonStr = chunk.startsWith('data: ') ? chunk.slice(6) : chunk;
    const data = JSON.parse(jsonStr);
    return {
      type: data.type,
      content: data.content || (data.type === 'citations' ? [] : ''),
    };
  } catch (error) {
    console.error('Error parsing streaming response:', error);
    console.error('Problematic chunk:', chunk);
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
    if (typeof citation !== 'string') {
      console.error(`Citation at index ${index} is not a string:`, citation);
      return { index, url: '' };
    }
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

export const constructHansardUrl = (debateExtId: string, title: string, date: string) => {
  // Convert title to PascalCase
  const formattedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  // Format date with hyphens (yyyy-MM-dd)
  const formattedDate = date.replace(/\//g, '-');

  return `https://hansard.parliament.uk/House/${formattedDate}/debates/${debateExtId}/${formattedTitle}`;
};

// Add specific type for vector store data
type VectorStoreData = {
  processedFiles?: string[];
  status?: string;
  message?: string;
};

type VectorStoreResponse = {
  success: boolean;
  error?: string;
  data?: VectorStoreData;
};

// Add files to vector store
export async function addFilesToVectorStore(fileIds: string[]): Promise<VectorStoreResponse> {
  try {
    const response = await fetch('/api/assistant/vector-store/add-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to add files to vector store');
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error adding files to vector store:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Remove file from vector store
export async function removeFileFromVectorStore(fileId: string): Promise<VectorStoreResponse> {
  try {
    const response = await fetch('/api/assistant/vector-store/remove-file', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove file from vector store');
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error removing file from vector store:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}