import { useState, useCallback } from 'react';
import { parseStreamingResponse } from '@/lib/openai-api';

export function useAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);

  const performFileSearch = useCallback(async (
    query: string, 
    openaiAssistantId: string | null,
    onStreamingUpdate?: (text: string, citations: string[]) => void
  ) => {
    setIsLoading(true);
    setStreamingText('');
    setCitations([]);

    try {
      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, assistantId: openaiAssistantId }),
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let currentCitations: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const { type, content } = parseStreamingResponse(line);
              
              switch (type) {
                case 'text':
                  currentText += content;
                  setStreamingText(currentText);
                  onStreamingUpdate?.(currentText, currentCitations);
                  break;
                case 'finalText':
                  currentText = content as string;
                  setStreamingText(currentText);
                  onStreamingUpdate?.(currentText, currentCitations);
                  break;
                case 'citations':
                  currentCitations = content as string[];
                  setCitations(currentCitations);
                  onStreamingUpdate?.(currentText, currentCitations);
                  break;
                case 'error':
                  throw new Error(content as string);
              }
            } catch (e) {
              console.error('Error processing line:', e);
            }
          }
        }
      }

      // Ensure final state is set
      setStreamingText(currentText);
      setCitations(currentCitations);
      onStreamingUpdate?.(currentText, currentCitations);

    } catch (error) {
      console.error('Error in file search:', error);
      setStreamingText('An error occurred while searching.');
      onStreamingUpdate?.('An error occurred while searching.', []);
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