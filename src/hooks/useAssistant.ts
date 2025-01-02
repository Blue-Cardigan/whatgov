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
    onStreamingUpdate?: (text: string, citations: Citation[]) => void,
    onComplete?: () => void
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

      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`
        },
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
      let currentCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const { type, content } = parseStreamingResponse(line);
              
              switch (type) {
                case 'citations':
                  if (Array.isArray(content)) {
                    currentCitations = (content as Citation[])
                      .map((citation) => ({
                        citation_index: Number(citation.citation_index),
                        debate_id: citation.debate_id,
                        chunk_text: citation.chunk_text
                      }))
                      .sort((a, b) => a.citation_index - b.citation_index);
                    onStreamingUpdate?.(currentText, currentCitations);
                  }
                  break;

                case 'text':
                case 'finalText':
                  currentText += typeof content === 'string' ? content : String(content);
                  onStreamingUpdate?.(currentText, currentCitations);
                  break;

                case 'error':
                  throw new Error(typeof content === 'string' ? content : 'Unknown error');
                  
                default:
                  break;
              }
            } catch (e) {
              console.error('Error processing stream:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onStreamingUpdate?.(errorMessage, []);
      
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