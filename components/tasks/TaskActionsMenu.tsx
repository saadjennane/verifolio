'use client';

import { useState, useRef, useEffect } from 'react';
import type { Task } from '@/lib/tasks/types';

interface TaskActionsMenuProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskActionsMenu({ task, onEdit, onDelete }: TaskActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDelete = () => {
    if (confirm('Supprimer cette tâche ?')) {
      onDelete();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 p-1"
        title="Actions"
      >
        ⋮
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]"
        >
          <button
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            ✏️ Modifier
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            🗑️ Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
