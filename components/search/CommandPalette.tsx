'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Loader2 } from 'lucide-react';
import { useUniversalSearch } from '@/lib/hooks/useUniversalSearch';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useSearchStore } from '@/lib/stores/search-store';
import { SearchResultGroup } from './SearchResultGroup';
import { SearchHistory } from './SearchHistory';
import type { SearchResult } from '@/lib/search/types';

export function CommandPalette() {
  const { isOpen, closeSearch: setIsOpenFalse, openSearch: setIsOpenTrue } = useSearchStore();
  const setIsOpen = (open: boolean) => open ? setIsOpenTrue() : setIsOpenFalse();

  const { query, setQuery, results, isLoading } = useUniversalSearch();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();
  const { openTab } = useTabsStore();
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Flatten results for keyboard navigation
  const flatResults = results.flatMap((g) => g.items);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  // Global Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen, setQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const highlightedElement = resultsRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      highlightedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, flatResults.length]);

  const handleSelect = useCallback(
    (result: SearchResult, permanent = false) => {
      addToHistory(result);
      openTab(
        {
          type: result.tabType as any,
          path: result.path,
          title: result.title,
          entityId: result.id,
        },
        { source: 'user', forceNew: permanent }
      );
      setIsOpen(false);
    },
    [addToHistory, openTab, setIsOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatResults[highlightedIndex]) {
          const permanent = e.metaKey || e.ctrlKey;
          handleSelect(flatResults[highlightedIndex], permanent);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-[600px] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Input */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 py-4 px-3 text-lg outline-none bg-transparent placeholder:text-muted-foreground"
            placeholder="Rechercher clients, deals, factures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {isLoading && (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[400px] overflow-auto">
          {/* History when no query */}
          {!query && history.length > 0 && (
            <SearchHistory
              items={history}
              onSelect={handleSelect}
              onRemove={removeFromHistory}
            />
          )}

          {/* Search results */}
          {results.map((group, groupIdx) => (
            <SearchResultGroup
              key={group.type}
              group={group}
              startIndex={results
                .slice(0, groupIdx)
                .reduce((acc, g) => acc + g.items.length, 0)}
              highlightedIndex={highlightedIndex}
              onSelect={handleSelect}
              onHighlight={setHighlightedIndex}
            />
          ))}

          {/* Empty state */}
          {query && !isLoading && flatResults.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p>Aucun résultat pour "{query}"</p>
              <p className="text-sm mt-1">Essayez avec d'autres termes</p>
            </div>
          )}

          {/* Initial state */}
          {!query && history.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p>Commencez à taper pour rechercher</p>
              <p className="text-sm mt-1">
                Clients, contacts, deals, missions, factures...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground bg-muted/30">
          <span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
              ↑↓
            </kbd>{' '}
            naviguer
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
              ↵
            </kbd>{' '}
            ouvrir
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
              ⌘↵
            </kbd>{' '}
            nouvel onglet
          </span>
          <span className="ml-auto">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
              ESC
            </kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
