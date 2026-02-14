'use client';

import { ENTITY_CONFIG } from '@/lib/search/constants';
import { SearchResultItem } from './SearchResultItem';
import type { SearchResult, SearchResultGroup as SearchResultGroupType } from '@/lib/search/types';

interface SearchResultGroupProps {
  group: SearchResultGroupType;
  startIndex: number;
  highlightedIndex: number;
  onSelect: (result: SearchResult, permanent?: boolean) => void;
  onHighlight: (index: number) => void;
}

export function SearchResultGroup({
  group,
  startIndex,
  highlightedIndex,
  onSelect,
  onHighlight,
}: SearchResultGroupProps) {
  const config = ENTITY_CONFIG[group.type];

  return (
    <div className="py-2">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">({group.items.length})</span>
      </div>

      {/* Items */}
      {group.items.map((item, idx) => (
        <SearchResultItem
          key={`${item.entityType}-${item.id}`}
          result={item}
          isHighlighted={highlightedIndex === startIndex + idx}
          onSelect={onSelect}
          onMouseEnter={() => onHighlight(startIndex + idx)}
        />
      ))}
    </div>
  );
}
