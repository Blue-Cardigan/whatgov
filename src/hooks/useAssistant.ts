import { useState, useCallback, useEffect } from 'react';
import { createThread } from '@/lib/openai-api';

export function useAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);

  useEffect(() => {
    const initializeThread = async () => {
      try {
        const { threadId } = await createThread();
        setThreadId(threadId);
      } catch (error) {
        console.error('Error creating thread:', error);
      }
    };

    initializeThread();
  }, []);

  const performFileSearch = useCallback(async (
    query: string, 
    openaiAssistantId: string | null
  ) => {
    setIsLoading(true);
    setStreamingText('');
    setCitations([]);

    try {
      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          assistantId: openaiAssistantId 
        }),
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Append new chunks to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete messages from buffer
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const chunk = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (chunk.trim()) {
            try {
              const data = JSON.parse(chunk);
              
              if (data.type === 'text') {
                setStreamingText(current => current + data.content);
              } else if (data.type === 'finalText') {
                setStreamingText(data.content);
              } else if (data.type === 'citations') {
                setCitations(data.content);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in file search:', error);
      setStreamingText('An error occurred while searching.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    threadId,
    performFileSearch,
    streamingText,
    citations
  };
} 