import { useState, useCallback, useMemo } from 'react';

interface UseBulkSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

interface UseBulkSelectionReturn<T> {
  // State
  selectedIds: Set<string>;
  isSelectionMode: boolean;

  // Computed
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isNoneSelected: boolean;
  hasSelection: boolean;
  selectedItems: T[];

  // Actions
  toggleSelectionMode: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleItem: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
}

export function useBulkSelection<T>({
  items,
  getItemId,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const allIds = useMemo(() => items.map(getItemId), [items, getItemId]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode - clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId]
  );

  return {
    selectedIds,
    isSelectionMode,
    selectedCount: selectedIds.size,
    totalCount: allIds.length,
    isAllSelected: selectedIds.size === allIds.length && allIds.length > 0,
    isNoneSelected: selectedIds.size === 0,
    hasSelection: selectedIds.size > 0,
    selectedItems,
    toggleSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleItem,
    selectAll,
    deselectAll,
    isSelected,
  };
}
