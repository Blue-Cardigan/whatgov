import { useState, useCallback } from 'react';
import { parseStreamingResponse } from '@/lib/openai-api';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';

export function useAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);
  const { hasReachedAISearchLimit, recordAISearch } = useEngagement();
  const { toast } = useToast();

  const performFileSearch = useCallback(async (
    query: string, 
    openaiAssistantId: string | null,
    onStreamingUpdate?: (text: string, citations: string[]) => void
  ) => {
    // Check limits before proceeding
    if (hasReachedAISearchLimit()) {
      toast({
        title: "Search limit reached",
        description: "Please upgrade your account to continue using AI search",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStreamingText('');
    setCitations([]);

    try {
      // Record the AI search before making the request
      await recordAISearch();

      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, assistantId: openaiAssistantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Stream request failed');
      }

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
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while searching.';
      setStreamingText(errorMessage);
      onStreamingUpdate?.(errorMessage, []);
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hasReachedAISearchLimit, recordAISearch, toast]);

  return {
    isLoading,
    performFileSearch,
    streamingText,
    citations
  };
} 