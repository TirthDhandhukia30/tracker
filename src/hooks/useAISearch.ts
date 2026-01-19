import { useState, useCallback } from 'react';

interface Metric {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface Highlight {
  date: string;
  title: string;
  description: string;
}

export interface AIResponse {
  summary: string;
  details?: string | null;
  metrics?: Metric[];
  highlights?: Highlight[];
  suggestion?: string | null;
}

interface UseAISearchResult {
  query: (text: string) => Promise<AIResponse>;
  isLoading: boolean;
  error: string | null;
  lastResponse: AIResponse | null;
}

export function useAISearch(): UseAISearchResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  const query = useCallback(async (text: string): Promise<AIResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse: AIResponse = data.response || { summary: 'No response' };
      setLastResponse(aiResponse);
      return aiResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { query, isLoading, error, lastResponse };
}
