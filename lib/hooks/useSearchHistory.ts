'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SearchResult, SearchHistoryItem } from '@/lib/search/types';

const STORAGE_KEY = 'verifolio-search-history';
const MAX_HISTORY_ITEMS = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load search history:', e);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save search history:', e);
    }
  }, [history]);

  const addToHistory = useCallback((result: SearchResult) => {
    setHistory((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        (h) => !(h.entityType === result.entityType && h.id === result.id)
      );
      // Add new item at the beginning
      const newHistory: SearchHistoryItem[] = [
        { ...result, searchedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS);
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeFromHistory = useCallback((id: string, entityType: string) => {
    setHistory((prev) =>
      prev.filter((h) => !(h.id === id && h.entityType === entityType))
    );
  }, []);

  return { history, addToHistory, clearHistory, removeFromHistory };
}
