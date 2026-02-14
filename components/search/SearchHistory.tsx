'use client';

import { Clock, X } from 'lucide-react';
import { ENTITY_CONFIG } from '@/lib/search/constants';
import type { SearchResult, SearchHistoryItem } from '@/lib/search/types';

interface SearchHistoryProps {
  items: SearchHistoryItem[];
  onSelect: (result: SearchResult, permanent?: boolean) => void;
  onRemove?: (id: string, entityType: string) => void;
}

export function SearchHistory({ items, onSelect, onRemove }: SearchHistoryProps) {
  if (items.length === 0) return null;

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-1">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Récents
        </span>
      </div>

      {/* Items */}
      {items.map((item) => {
        const config = ENTITY_CONFIG[item.entityType];
        const Icon = config.icon;

        return (
          <div
            key={`${item.entityType}-${item.id}`}
            className="group flex items-center gap-3 px-4 py-2 hover:bg-accent/50 cursor-pointer"
          >
            <button
              onClick={(e) => {
                const permanent = e.metaKey || e.ctrlKey;
                onSelect(item, permanent);
              }}
              className="flex-1 flex items-center gap-3 text-left min-w-0"
            >
              <div className={`shrink-0 ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-muted-foreground truncate">
                    {item.subtitle}
                  </div>
                )}
              </div>
            </button>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id, item.entityType);
                }}
                className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity"
                title="Retirer de l'historique"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
