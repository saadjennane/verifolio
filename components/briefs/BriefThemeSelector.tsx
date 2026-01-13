'use client';

import { getAllBriefThemes, type BriefThemeColor, type BriefTheme } from '@/lib/briefs/themes';

interface BriefThemeSelectorProps {
  selectedColor: BriefThemeColor;
  showLogo: boolean;
  onColorChange: (color: BriefThemeColor) => void;
  onShowLogoChange: (show: boolean) => void;
}

export function BriefThemeSelector({
  selectedColor,
  showLogo,
  onColorChange,
  onShowLogoChange,
}: BriefThemeSelectorProps) {
  const themes = getAllBriefThemes();

  return (
    <div className="space-y-4">
      {/* Color selector - 3 rows of 4 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Couleur du formulaire
        </label>
        <div className="grid grid-cols-4 gap-2">
          {themes.map((theme) => (
            <ColorButton
              key={theme.id}
              theme={theme}
              isSelected={selectedColor === theme.id}
              onClick={() => onColorChange(theme.id)}
            />
          ))}
        </div>
      </div>

      {/* Logo toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showLogo}
            onChange={(e) => onShowLogoChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
        </label>
        <span className="text-sm text-gray-600">
          Afficher mon logo
        </span>
      </div>
    </div>
  );
}

// Color button component
interface ColorButtonProps {
  theme: BriefTheme;
  isSelected: boolean;
  onClick: () => void;
}

function ColorButton({ theme, isSelected, onClick }: ColorButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-8 h-8 rounded-full transition-all
        ${isSelected ? 'scale-110' : 'hover:scale-105'}
      `}
      style={{
        backgroundColor: theme.accent,
        boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${theme.accent}` : undefined,
      }}
      title={theme.name}
    >
      {isSelected && (
        <svg
          className="absolute inset-0 m-auto w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// Compact version for inline use
interface BriefThemeSelectorCompactProps {
  selectedColor: BriefThemeColor;
  onColorChange: (color: BriefThemeColor) => void;
}

export function BriefThemeSelectorCompact({
  selectedColor,
  onColorChange,
}: BriefThemeSelectorCompactProps) {
  const themes = getAllBriefThemes();

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => onColorChange(theme.id)}
          className={`
            w-6 h-6 rounded-full transition-all
            ${selectedColor === theme.id ? 'scale-110' : 'hover:scale-105'}
          `}
          style={{
            backgroundColor: theme.accent,
            boxShadow: selectedColor === theme.id ? `0 0 0 2px white, 0 0 0 3px ${theme.accent}` : undefined,
          }}
          title={theme.name}
        />
      ))}
    </div>
  );
}
