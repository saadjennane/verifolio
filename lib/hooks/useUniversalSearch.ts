import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import type { GroupedResults } from '@/lib/search/types';

export function useUniversalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Search error:', e);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  return { query, setQuery, results, isLoading };
}
