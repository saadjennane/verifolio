'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettingsCompletionStore } from '@/lib/stores/settings-completion-store';

export interface SettingsSection {
  complete: boolean;
  label: string;
}

export interface SettingsCompletionData {
  sections: {
    profile: SettingsSection;
    company: SettingsSection;
    templates: SettingsSection;
    emails: SettingsSection;
  };
  percentage: number;
  allComplete: boolean;
}

interface UseSettingsCompletionReturn {
  data: SettingsCompletionData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Cache duration: 5 minutes
const CACHE_KEY = 'verifolio-settings-completion-cache';
const CACHE_DURATION_MS = 5 * 60 * 1000;

export function useSettingsCompletion(): UseSettingsCompletionReturn {
  const [data, setData] = useState<SettingsCompletionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const invalidateCounter = useSettingsCompletionStore((state) => state.invalidateCounter);

  const fetchCompletion = useCallback(async (skipCache = false) => {
    // Check cache first (only in browser)
    if (!skipCache && typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION_MS) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore cache errors
      }
    }

    try {
      setLoading(true);
      const res = await fetch('/api/settings/completion');

      if (!res.ok) {
        throw new Error('Failed to fetch completion status');
      }

      const json = await res.json();

      if (json.data) {
        // Update cache
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
              data: json.data,
              timestamp: Date.now(),
            }));
          } catch {
            // Ignore cache write errors
          }
        }

        setData(json.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletion();
  }, [fetchCompletion]);

  // Refetch when invalidateCounter changes (triggered by settings saves)
  useEffect(() => {
    if (invalidateCounter > 0) {
      fetchCompletion(true);
    }
  }, [invalidateCounter, fetchCompletion]);

  const refresh = useCallback(() => {
    // Clear cache and refetch
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch {
        // Ignore
      }
    }
    fetchCompletion(true);
  }, [fetchCompletion]);

  return { data, loading, error, refresh };
}
