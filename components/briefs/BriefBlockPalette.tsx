'use client';

import type { BriefQuestionType } from '@/lib/briefs/types';
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_ICONS } from '@/lib/briefs/types';

interface BlockCategory {
  title: string;
  blocks: BriefQuestionType[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    title: 'Structure',
    blocks: ['title', 'description', 'separator', 'media'],
  },
  {
    title: 'Collecte',
    blocks: ['text_short', 'text_long', 'number', 'address', 'time', 'date', 'selection', 'rating'],
  },
];

interface BriefBlockPaletteProps {
  onAddBlock: (type: BriefQuestionType) => void;
}

export function BriefBlockPalette({ onAddBlock }: BriefBlockPaletteProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Composants</h3>

      {BLOCK_CATEGORIES.map((category) => (
        <div key={category.title} className="mb-6">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {category.title}
          </h4>
          <div className="space-y-1">
            {category.blocks.map((type) => (
              <button
                key={type}
                onClick={() => onAddBlock(type)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('block-type', type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-grab active:cursor-grabbing"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-mono">
                  {QUESTION_TYPE_ICONS[type]}
                </span>
                <span className="text-sm text-gray-700">
                  {QUESTION_TYPE_LABELS[type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Tips section */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Astuce:</strong> Glissez-deposez les blocs ou cliquez pour les ajouter au brief.
        </p>
      </div>
    </div>
  );
}
