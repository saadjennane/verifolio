'use client';

import type { ProposalVisualOptions as VisualOptionsType } from '@/lib/proposals/presets/types';

interface ProposalVisualOptionsProps {
  value: VisualOptionsType;
  onChange: (options: VisualOptionsType) => void;
}

export function ProposalVisualOptions({ value, onChange }: ProposalVisualOptionsProps) {
  const handleToggle = (key: keyof VisualOptionsType) => {
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  const handleFooterChange = (footerText: string) => {
    onChange({
      ...value,
      footerText: footerText || undefined,
    });
  };

  const handleWatermarkToggle = () => {
    onChange({
      ...value,
      watermark: {
        ...value.watermark,
        enabled: !value.watermark?.enabled,
        text: value.watermark?.text || 'BROUILLON',
        opacity: value.watermark?.opacity ?? 10,
      },
    });
  };

  const handleWatermarkTextChange = (text: string) => {
    onChange({
      ...value,
      watermark: {
        enabled: value.watermark?.enabled ?? false,
        text,
        opacity: value.watermark?.opacity ?? 10,
      },
    });
  };

  const handleWatermarkOpacityChange = (opacity: number) => {
    onChange({
      ...value,
      watermark: {
        enabled: value.watermark?.enabled ?? false,
        text: value.watermark?.text || 'BROUILLON',
        opacity,
      },
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Options visuelles</h3>

      <div className="space-y-3">
        {/* Toggle options in a row */}
        <div className="flex flex-wrap gap-4">
          <ToggleOption
            checked={value.showLogo}
            onChange={() => handleToggle('showLogo')}
            label="Logo"
          />
          <ToggleOption
            checked={value.showLogoOnAllPages}
            onChange={() => handleToggle('showLogoOnAllPages')}
            label="Logo sur toutes les pages"
          />
          <ToggleOption
            checked={value.showSectionNumbers}
            onChange={() => handleToggle('showSectionNumbers')}
            label="Sections numérotées"
          />
          <ToggleOption
            checked={value.showTableOfContents}
            onChange={() => handleToggle('showTableOfContents')}
            label="Table des matières"
          />
          <ToggleOption
            checked={value.showPageNumbers}
            onChange={() => handleToggle('showPageNumbers')}
            label="N° de page"
          />
        </div>

        {/* Footer text input */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
          <label className="text-xs text-gray-500 whitespace-nowrap">Pied de page:</label>
          <input
            type="text"
            value={value.footerText || ''}
            onChange={(e) => handleFooterChange(e.target.value)}
            placeholder="Texte personnalisé..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Watermark section */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center gap-4 mb-2">
            <ToggleOption
              checked={value.watermark?.enabled ?? false}
              onChange={handleWatermarkToggle}
              label="Filigrane"
            />
          </div>
          {value.watermark?.enabled && (
            <div className="flex items-center gap-3 pl-4">
              <input
                type="text"
                value={value.watermark?.text || 'BROUILLON'}
                onChange={(e) => handleWatermarkTextChange(e.target.value)}
                placeholder="Texte du filigrane..."
                className="flex-1 max-w-[200px] px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <span>Opacité:</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={value.watermark?.opacity ?? 10}
                  onChange={(e) => handleWatermarkOpacityChange(Number(e.target.value))}
                  className="w-20"
                />
                <span className="w-8 text-center">{value.watermark?.opacity ?? 10}%</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Toggle option component
function ToggleOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        className={`
          relative w-8 h-5 rounded-full transition-colors
          ${checked ? 'bg-blue-500' : 'bg-gray-300'}
        `}
        onClick={onChange}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
            ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}
          `}
        />
      </div>
      <span className="text-sm text-gray-600 group-hover:text-gray-900 select-none">
        {label}
      </span>
    </label>
  );
}
