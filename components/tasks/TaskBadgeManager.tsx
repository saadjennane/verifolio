'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';

interface TaskBadgeManagerProps {
  taskId: string;
  currentBadges: { badge: string; variant: string }[];
  onUpdate: () => void;
}

const AVAILABLE_BADGES = [
  { name: 'URGENT', variant: 'red' },
  { name: 'IMPORTANT', variant: 'yellow' },
  { name: 'BLOCKED', variant: 'red' },
] as const;

export function TaskBadgeManager({ taskId, currentBadges, onUpdate }: TaskBadgeManagerProps) {
  const [showMenu, setShowMenu] = useState(false);

  const hasBadge = (name: string) =>
    currentBadges.some(b => b.badge === name);

  async function toggleBadge(name: string, variant: string) {
    const exists = hasBadge(name);

    try {
      if (exists) {
        await fetch(`/api/tasks/${taskId}/badges?badge=${encodeURIComponent(name)}`, {
          method: 'DELETE',
        });
      } else {
        await fetch(`/api/tasks/${taskId}/badges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badge: name, variant }),
        });
      }

      onUpdate();
      setShowMenu(false);
    } catch (error) {
      console.error('Error toggling badge:', error);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-xs text-gray-500 hover:text-blue-600"
        title="Gérer les badges"
      >
        🏷️
      </button>

      {showMenu && (
        <>
          {/* Overlay pour fermer le menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg p-2 z-20 min-w-[150px]">
            {AVAILABLE_BADGES.map(({ name, variant }) => (
              <button
                key={name}
                onClick={() => toggleBadge(name, variant)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
              >
                <span className="mr-2">{hasBadge(name) ? '✓' : ' '}</span>
                <Badge variant={variant as any}>{name}</Badge>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
