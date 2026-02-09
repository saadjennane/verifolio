'use client';

import { X } from 'lucide-react';
import { Button } from './Button';

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive';
  onClick: () => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onSelectAll?: () => void;
  onDeselectAll: () => void;
  onExit: () => void;
  isAllSelected?: boolean;
  totalCount?: number;
  children?: React.ReactNode;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onSelectAll,
  onDeselectAll,
  onExit,
  isAllSelected,
  totalCount,
  children,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3">
        {/* Selection count */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">{selectedCount}</span>
          <span>selectionne{selectedCount > 1 ? 's' : ''}</span>
        </div>

        {/* Select all / Deselect all */}
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
        {onSelectAll && !isAllSelected && (
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Tout selectionner{totalCount ? ` (${totalCount})` : ''}
          </button>
        )}
        {selectedCount > 0 && (
          <button
            onClick={onDeselectAll}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Tout deselectionner
          </button>
        )}

        {/* Actions */}
        {actions.length > 0 && selectedCount > 0 && (
          <>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              {actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Custom children */}
        {children && selectedCount > 0 && (
          <>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            {children}
          </>
        )}

        {/* Exit button */}
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <button
          onClick={onExit}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
