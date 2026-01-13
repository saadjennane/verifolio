'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import { TEMPLATE_PRESETS } from '@/lib/templates/presets';
import type { PresetLayoutId } from '@/lib/types/settings';

interface PresetSelectorProps {
  value: PresetLayoutId;
  onChange: (presetId: PresetLayoutId) => void;
}

// Mini SVG thumbnails for dropdown
const PRESET_THUMBNAILS: Record<PresetLayoutId, ReactElement> = {
  classic: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect x="5" y="5" width="25" height="8" rx="1" fill="currentColor" opacity="0.7" />
      <line x1="5" y1="18" x2="95" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <rect x="5" y="24" width="45" height="25" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <rect x="55" y="24" width="40" height="25" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="5" y="55" width="90" height="5" fill="currentColor" opacity="0.15" />
      <rect x="5" y="60" width="90" height="30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <rect x="55" y="96" width="40" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <rect x="5" y="96" width="45" height="20" rx="2" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="130" x2="95" y2="130" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
    </svg>
  ),
  modern: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect x="0" y="0" width="100" height="4" fill="currentColor" opacity="0.8" />
      <rect x="8" y="12" width="20" height="8" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="8" y="30" width="40" height="28" rx="4" fill="currentColor" opacity="0.06" />
      <rect x="52" y="30" width="40" height="28" rx="4" fill="currentColor" opacity="0.06" />
      <line x1="8" y1="68" x2="92" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <rect x="8" y="74" width="84" height="10" rx="2" fill="currentColor" opacity="0.04" />
      <rect x="8" y="86" width="84" height="10" rx="2" fill="currentColor" opacity="0.04" />
      <rect x="52" y="102" width="40" height="22" rx="4" fill="currentColor" opacity="0.1" />
      <rect x="0" y="130" width="100" height="10" fill="currentColor" opacity="0.05" />
    </svg>
  ),
  minimal: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect x="35" y="10" width="30" height="8" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="30" y="26" width="40" height="4" rx="1" fill="currentColor" opacity="0.2" />
      <line x1="20" y1="36" x2="80" y2="36" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <rect x="10" y="46" width="20" height="2" rx="0.5" fill="currentColor" opacity="0.1" />
      <rect x="10" y="50" width="30" height="2" rx="0.5" fill="currentColor" opacity="0.2" />
      <line x1="10" y1="70" x2="90" y2="70" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <rect x="10" y="75" width="50" height="2" rx="0.5" fill="currentColor" opacity="0.15" />
      <rect x="10" y="82" width="45" height="2" rx="0.5" fill="currentColor" opacity="0.15" />
      <line x1="50" y1="105" x2="90" y2="105" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <rect x="50" y="110" width="40" height="4" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  elegant: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect x="8" y="8" width="40" height="5" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="72" y="8" width="20" height="14" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="8" y="28" width="84" height="2" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="6" y="36" width="2" height="18" fill="currentColor" opacity="0.6" />
      <rect x="50" y="36" width="42" height="25" rx="3" fill="currentColor" opacity="0.05" />
      <rect x="8" y="68" width="84" height="6" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="8" y="74" width="84" height="22" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <rect x="52" y="102" width="40" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    </svg>
  ),
  professional: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect x="5" y="5" width="20" height="12" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="55" y="5" width="30" height="6" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="5" y="35" width="90" height="22" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
      <rect x="5" y="62" width="90" height="5" fill="currentColor" opacity="0.1" />
      <rect x="5" y="67" width="90" height="28" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <line x1="40" y1="62" x2="40" y2="95" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <line x1="55" y1="62" x2="55" y2="95" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
      <rect x="55" y="100" width="40" height="18" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
      <rect x="0" y="133" width="100" height="7" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  creative: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect x="0" y="0" width="12" height="140" fill="currentColor" opacity="0.8" />
      <rect x="18" y="10" width="25" height="8" rx="1" fill="currentColor" opacity="0.5" />
      <line x1="18" y1="26" x2="92" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <rect x="18" y="42" width="30" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="58" y="34" width="34" height="8" rx="2" fill="currentColor" opacity="0.06" />
      <rect x="18" y="62" width="74" height="12" rx="3" fill="currentColor" opacity="0.05" />
      <rect x="18" y="62" width="2" height="12" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="18" y="78" width="74" height="12" rx="3" fill="currentColor" opacity="0.05" />
      <rect x="18" y="78" width="2" height="12" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="55" y="98" width="37" height="22" rx="4" fill="currentColor" opacity="0.8" />
    </svg>
  ),
};

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
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

  const selectedPreset = TEMPLATE_PRESETS.find(p => p.id === value) || TEMPLATE_PRESETS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
      >
        {/* Mini thumbnail */}
        <div className="w-6 h-8 text-gray-500 flex-shrink-0">
          {PRESET_THUMBNAILS[value]}
        </div>
        {/* Name */}
        <span className="text-sm text-gray-700">{selectedPreset.name}</span>
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 min-w-[360px]">
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATE_PRESETS.map((preset) => {
              const isSelected = value === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onChange(preset.id as PresetLayoutId);
                    setIsOpen(false);
                  }}
                  className={`
                    relative flex flex-col items-center p-2 rounded-lg border transition-all
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }
                  `}
                  title={preset.description}
                >
                  {/* Thumbnail */}
                  <div
                    className={`
                      w-full aspect-[5/7] rounded bg-white border border-gray-100 mb-1.5
                      flex items-center justify-center overflow-hidden
                      ${isSelected ? 'text-blue-600' : 'text-gray-400'}
                    `}
                  >
                    {PRESET_THUMBNAILS[preset.id as PresetLayoutId]}
                  </div>

                  {/* Name */}
                  <span
                    className={`
                      text-xs font-medium truncate w-full text-center
                      ${isSelected ? 'text-blue-700' : 'text-gray-600'}
                    `}
                  >
                    {preset.name}
                  </span>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
