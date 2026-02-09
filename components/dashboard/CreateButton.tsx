'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreateModal } from '@/components/modals/CreateModal';

export function CreateButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>Nouveau</span>
      </button>
      <CreateModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
