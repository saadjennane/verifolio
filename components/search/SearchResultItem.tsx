'use client';

import { ENTITY_CONFIG } from '@/lib/search/constants';
import type { SearchResult } from '@/lib/search/types';

interface SearchResultItemProps {
  result: SearchResult;
  isHighlighted: boolean;
  onSelect: (result: SearchResult, permanent?: boolean) => void;
  onMouseEnter: () => void;
}

export function SearchResultItem({
  result,
  isHighlighted,
  onSelect,
  onMouseEnter,
}: SearchResultItemProps) {
  const config = ENTITY_CONFIG[result.entityType];
  const Icon = config.icon;

  const handleClick = (e: React.MouseEvent) => {
    const permanent = e.metaKey || e.ctrlKey;
    onSelect(result, permanent);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-left
        transition-colors cursor-pointer
        ${isHighlighted ? 'bg-accent' : 'hover:bg-accent/50'}
      `}
    >
      <div className={`shrink-0 ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">
          {result.title}
        </div>
        {result.subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {result.subtitle}
          </div>
        )}
      </div>
    </button>
  );
}
