import { useState, useCallback } from 'react';
import { parseStreamingResponse } from '@/lib/openai-api';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
import { Citation } from '@/types/search';
import { useAuth } from '@/contexts/AuthContext';

export function useAssistant() {
  const { getAuthHeader } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { hasReachedResearchSearchLimit, recordResearchSearch } = useEngagement();
  const { toast } = useToast();

  const performFileSearch = useCallback(async (
    query: string, 
    openaiAssistantId: string | null,
    onStreamingUpdate?: (text: string, citations: Citation[], isFinal: boolean) => void,
    onComplete?: () => void,
    useRecentFiles: boolean = false
  ) => {
    if (hasReachedResearchSearchLimit()) {
      toast({
        title: "Search limit reached",
        description: "Please upgrade your account to continue using AI search",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await recordResearchSearch();
      const authHeader = await getAuthHeader();

      console.log('[Assistant] Starting search with query:', query);
      console.log('[Assistant] Using recent files:', useRecentFiles);

      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`
        },
        body: JSON.stringify({ 
          query, 
          assistantId: openaiAssistantId,
          useRecentFiles
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let hasStartedStreaming = false;
      const decoder = new TextDecoder();
      let buffer = '';
      let currentCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[Assistant] Stream complete');
          onComplete?.();
          break;
        }

        if (!hasStartedStreaming) {
          setIsLoading(false);
          hasStartedStreaming = true;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const { type, content } = JSON.parse(line);              
              switch (type) {
                case 'text':
                  onStreamingUpdate?.(
                    content.content || content,
                    currentCitations,
                    false
                  );
                  break;

                case 'finalText':
                  onStreamingUpdate?.(
                    content.text,
                    currentCitations,
                    true
                  );
                  break;

                case 'citations':
                  currentCitations = content.content || content;
                  onStreamingUpdate?.(
                    buffer,
                    currentCitations,
                    false
                  );
                  break;
              }
            } catch (e) {
              console.error('[Assistant] Error processing stream chunk:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('[Assistant] Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onStreamingUpdate?.(errorMessage, [], false);
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hasReachedResearchSearchLimit, recordResearchSearch, toast, getAuthHeader]);

  return {
    isLoading,
    performFileSearch
  };
} 