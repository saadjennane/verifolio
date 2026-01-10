'use client';

import { useState } from 'react';
import { TAG_COLORS, type TagColor } from '@/lib/constants/badges-tags';

interface TagColorPickerProps {
  selectedColor: TagColor;
  onColorChange: (color: TagColor) => void;
}

export function TagColorPicker({ selectedColor, onColorChange }: TagColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (colorId: TagColor) => {
    onColorChange(colorId);
    setIsOpen(false);
  };

  const selectedColorData = TAG_COLORS.find(c => c.id === selectedColor) || TAG_COLORS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-6 h-6 rounded"
          style={{ backgroundColor: selectedColorData.hex }}
        />
        <span className="text-sm text-gray-700">{selectedColorData.label}</span>
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette de couleurs */}
          <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                Choisir une couleur
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorSelect(color.id as TagColor)}
                    className={`
                      flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 transition-colors
                      ${color.id === selectedColor ? 'ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs text-gray-600">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
