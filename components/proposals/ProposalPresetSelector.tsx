'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import { PROPOSAL_PRESETS } from '@/lib/proposals/presets';
import type { ProposalPresetId } from '@/lib/proposals/presets/types';

interface ProposalPresetSelectorProps {
  value: ProposalPresetId;
  onChange: (presetId: ProposalPresetId) => void;
}

// Mini SVG thumbnails for dropdown - proposal-specific designs
const PRESET_THUMBNAILS: Record<ProposalPresetId, ReactElement> = {
  classic: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Header with logo */}
      <rect x="5" y="5" width="25" height="8" rx="1" fill="currentColor" opacity={0.7} />
      <line x1="5" y1="18" x2="95" y2="18" stroke="currentColor" strokeWidth="0.5" opacity={0.3} />
      {/* Title */}
      <rect x="5" y="24" width="60" height="6" rx="1" fill="currentColor" opacity={0.4} />
      {/* Client info */}
      <rect x="5" y="36" width="40" height="20" rx="2" fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth="0.5" strokeOpacity={0.3} />
      {/* Sections */}
      <rect x="5" y="62" width="8" height="8" rx="4" fill="currentColor" opacity={0.6} />
      <rect x="18" y="64" width="50" height="4" fill="currentColor" opacity={0.3} />
      <rect x="5" y="76" width="90" height="15" fill="currentColor" opacity={0.05} />
      <rect x="5" y="96" width="8" height="8" rx="4" fill="currentColor" opacity={0.6} />
      <rect x="18" y="98" width="45" height="4" fill="currentColor" opacity={0.3} />
      <rect x="5" y="110" width="90" height="15" fill="currentColor" opacity={0.05} />
      {/* Footer */}
      <line x1="5" y1="132" x2="95" y2="132" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
    </svg>
  ),
  modern: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Top accent band */}
      <rect x="0" y="0" width="100" height="4" fill="currentColor" opacity={0.8} />
      {/* Logo */}
      <rect x="8" y="12" width="20" height="8" rx="1" fill="currentColor" opacity={0.5} />
      {/* Title card */}
      <rect x="8" y="28" width="84" height="18" rx="4" fill="currentColor" opacity={0.06} />
      <rect x="15" y="33" width="50" height="4" fill="currentColor" opacity={0.4} />
      {/* Info cards */}
      <rect x="8" y="52" width="40" height="20" rx="4" fill="currentColor" opacity={0.08} />
      <rect x="52" y="52" width="40" height="20" rx="4" fill="currentColor" opacity={0.08} />
      {/* Sections */}
      <rect x="8" y="78" width="84" height="20" rx="4" fill="currentColor" opacity={0.04} />
      <rect x="8" y="102" width="84" height="20" rx="4" fill="currentColor" opacity={0.04} />
      {/* Footer */}
      <rect x="0" y="130" width="100" height="10" fill="currentColor" opacity={0.05} />
    </svg>
  ),
  minimal: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Centered logo */}
      <rect x="35" y="10" width="30" height="8" rx="1" fill="currentColor" opacity={0.4} />
      {/* Divider */}
      <line x1="40" y1="24" x2="60" y2="24" stroke="currentColor" strokeWidth="0.5" opacity={0.3} />
      {/* Centered title */}
      <rect x="20" y="32" width="60" height="5" rx="1" fill="currentColor" opacity={0.3} />
      <rect x="30" y="42" width="40" height="3" rx="1" fill="currentColor" opacity={0.2} />
      {/* Minimal sections */}
      <rect x="15" y="60" width="30" height="3" fill="currentColor" opacity={0.25} />
      <rect x="15" y="68" width="70" height="2" fill="currentColor" opacity={0.1} />
      <rect x="15" y="74" width="65" height="2" fill="currentColor" opacity={0.1} />
      <rect x="15" y="90" width="28" height="3" fill="currentColor" opacity={0.25} />
      <rect x="15" y="98" width="70" height="2" fill="currentColor" opacity={0.1} />
      <rect x="15" y="104" width="60" height="2" fill="currentColor" opacity={0.1} />
      {/* Subtle footer */}
      <line x1="30" y1="125" x2="70" y2="125" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
    </svg>
  ),
  elegant: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Header */}
      <rect x="8" y="8" width="30" height="6" rx="1" fill="currentColor" opacity={0.5} />
      <rect x="72" y="8" width="20" height="10" rx="2" fill="currentColor" opacity={0.7} />
      {/* Decorative line */}
      <rect x="8" y="24" width="84" height="2" fill="currentColor" opacity={0.15} />
      {/* Title centered */}
      <rect x="20" y="34" width="60" height="5" fill="currentColor" opacity={0.35} />
      <rect x="35" y="42" width="30" height="1" fill="currentColor" opacity={0.5} />
      {/* Client block with accent */}
      <rect x="6" y="52" width="2" height="18" fill="currentColor" opacity={0.6} />
      <rect x="12" y="52" width="35" height="18" fill="currentColor" opacity={0.05} />
      {/* Sections with icons */}
      <rect x="8" y="78" width="10" height="10" rx="2" fill="currentColor" opacity={0.15} />
      <rect x="22" y="80" width="40" height="3" fill="currentColor" opacity={0.3} />
      <rect x="22" y="88" width="70" height="10" fill="currentColor" opacity={0.03} />
      <rect x="8" y="104" width="10" height="10" rx="2" fill="currentColor" opacity={0.15} />
      <rect x="22" y="106" width="35" height="3" fill="currentColor" opacity={0.3} />
      <rect x="22" y="114" width="70" height="10" fill="currentColor" opacity={0.03} />
      {/* Footer decoration */}
      <circle cx="50" cy="132" r="2" fill="currentColor" opacity={0.4} />
      <line x1="20" y1="132" x2="45" y2="132" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
      <line x1="55" y1="132" x2="80" y2="132" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
    </svg>
  ),
  professional: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Header with border */}
      <rect x="5" y="5" width="20" height="12" rx="1" fill="currentColor" opacity={0.4} />
      <rect x="60" y="5" width="35" height="18" fill="currentColor" opacity={0.8} />
      <line x1="5" y1="28" x2="95" y2="28" stroke="currentColor" strokeWidth="1.5" opacity={0.8} />
      {/* Info grid */}
      <rect x="5" y="34" width="90" height="22" fill="currentColor" opacity={0.04} stroke="currentColor" strokeWidth="0.3" strokeOpacity={0.2} />
      <line x1="50" y1="34" x2="50" y2="56" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
      {/* TOC */}
      <rect x="5" y="62" width="90" height="5" fill="currentColor" opacity={0.7} />
      <rect x="5" y="67" width="90" height="15" fill="none" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
      {/* Sections */}
      <rect x="5" y="88" width="90" height="6" fill="currentColor" opacity={0.08} />
      <rect x="3" y="88" width="2" height="6" fill="currentColor" opacity={0.6} />
      <rect x="5" y="94" width="90" height="12" fill="currentColor" opacity={0.02} />
      <rect x="5" y="110" width="90" height="6" fill="currentColor" opacity={0.08} />
      <rect x="3" y="110" width="2" height="6" fill="currentColor" opacity={0.6} />
      {/* Footer */}
      <rect x="0" y="130" width="100" height="10" fill="currentColor" opacity={0.8} />
    </svg>
  ),
  creative: (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Left sidebar */}
      <rect x="0" y="0" width="10" height="140" fill="currentColor" opacity={0.8} />
      {/* Company name */}
      <rect x="18" y="10" width="25" height="4" rx="1" fill="currentColor" opacity={0.5} />
      {/* Title with border accent */}
      <rect x="16" y="22" width="2" height="16" fill="currentColor" opacity={0.6} />
      <rect x="22" y="24" width="55" height="5" fill="currentColor" opacity={0.4} />
      <rect x="22" y="32" width="35" height="3" fill="currentColor" opacity={0.2} />
      {/* Meta strip */}
      <line x1="18" y1="48" x2="92" y2="48" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
      <rect x="18" y="52" width="20" height="8" fill="currentColor" opacity={0.05} />
      <rect x="42" y="52" width="20" height="8" fill="currentColor" opacity={0.05} />
      <rect x="66" y="52" width="20" height="8" fill="currentColor" opacity={0.05} />
      <line x1="18" y1="64" x2="92" y2="64" stroke="currentColor" strokeWidth="0.3" opacity={0.2} />
      {/* Sections */}
      <rect x="18" y="72" width="14" height="14" rx="3" fill="currentColor" opacity={0.7} />
      <rect x="36" y="74" width="45" height="4" fill="currentColor" opacity={0.3} />
      <rect x="36" y="80" width="30" height="2" fill="currentColor" opacity={0.5} />
      <rect x="18" y="94" width="14" height="14" rx="3" fill="currentColor" opacity={0.7} />
      <rect x="36" y="96" width="40" height="4" fill="currentColor" opacity={0.3} />
      <rect x="36" y="102" width="25" height="2" fill="currentColor" opacity={0.5} />
      {/* Footer */}
      <circle cx="22" cy="128" r="3" fill="currentColor" opacity={0.5} />
      <rect x="28" y="126" width="30" height="4" fill="currentColor" opacity={0.3} />
    </svg>
  ),
};

export function ProposalPresetSelector({ value, onChange }: ProposalPresetSelectorProps) {
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

  const selectedPreset = PROPOSAL_PRESETS.find(p => p.id === value) || PROPOSAL_PRESETS[0];

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
            {PROPOSAL_PRESETS.map((preset) => {
              const isSelected = value === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onChange(preset.id as ProposalPresetId);
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
                    {PRESET_THUMBNAILS[preset.id as ProposalPresetId]}
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
