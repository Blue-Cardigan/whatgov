import { useState, useCallback } from 'react';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
import { Citation } from '@/types/search';
import { useAuth } from '@/contexts/AuthContext';

export function useAssistant() {
  const { getAuthHeader } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { hasReachedAISearchLimit, recordAISearch } = useEngagement();
  const { toast } = useToast();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  
  const performAISearch = useCallback(
    async (
      query: string,
      openaiAssistantId: string | null,
      onStreamingUpdate?: (text: string, citations: Citation[], isFinal: boolean) => void,
      onComplete?: () => void,
      useRecentFiles: boolean = false
    ) => {
      if (hasReachedAISearchLimit()) {
        toast({
          title: "Search limit reached",
          description: "Please upgrade your account to continue using AI search",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      const makeRequest = async (threadId?: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
          const response = await fetch('/api/assistant/stream', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await getAuthHeader()}`
            },
            body: JSON.stringify({ 
              query, 
              assistantId: openaiAssistantId,
              useRecentFiles,
              threadId
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

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
              onComplete?.();
              break;
            }

            if (!hasStartedStreaming) {
              setIsLoading(false);
              hasStartedStreaming = true;
              await recordAISearch();
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                if (line.startsWith(':')) continue;
                
                try {
                  const { type, content } = JSON.parse(line);              
                  switch (type) {
                    case 'threadId':
                      setCurrentThreadId(content);
                      break;
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
          if (error instanceof Error && error.name === 'AbortError' && currentThreadId) {
            console.log('Request timed out, attempting to resume...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return makeRequest(currentThreadId);
          }
          throw error;
        }
      };

      try {
        await makeRequest();
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
        setCurrentThreadId(null);
        setIsLoading(false);
      }
    },
    [
      getAuthHeader,
      hasReachedAISearchLimit,
      toast,
      currentThreadId,
      setIsLoading,
      recordAISearch
    ]
  );

  return {
    isLoading,
    performAISearch
  };
} 