'use client';

import { getAllVerifolioThemes, type VerifolioThemeColor, type VerifolioTheme } from '@/lib/verifolio/themes';

interface VerifolioThemeSelectorProps {
  selectedColor: VerifolioThemeColor;
  showLogo: boolean;
  onColorChange: (color: VerifolioThemeColor) => void;
  onShowLogoChange: (show: boolean) => void;
}

export function VerifolioThemeSelector({
  selectedColor,
  showLogo,
  onColorChange,
  onShowLogoChange,
}: VerifolioThemeSelectorProps) {
  const themes = getAllVerifolioThemes();

  return (
    <div className="space-y-4">
      {/* Color selector - 3 rows of 4 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Couleur du profil
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

      {/* Logo toggle - Styled switch with icons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onShowLogoChange(!showLogo)}
          className={`
            relative flex items-center h-8 rounded-full p-1 transition-all duration-200
            ${showLogo
              ? 'bg-gray-900'
              : 'bg-gray-200'
            }
          `}
          style={{ width: '68px' }}
        >
          {/* Logo icon (left) */}
          <span
            className={`
              flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 z-10
              ${!showLogo ? 'text-gray-900' : 'text-gray-400'}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          {/* Checkmark icon (right) */}
          <span
            className={`
              flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 z-10
              ${showLogo ? 'text-white' : 'text-gray-400'}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {/* Sliding indicator */}
          <span
            className={`
              absolute w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-200
              ${showLogo ? 'left-[38px]' : 'left-1'}
            `}
          />
        </button>
        <span className="text-sm text-gray-600">
          Afficher mon logo
        </span>
      </div>
    </div>
  );
}

// Color button component
interface ColorButtonProps {
  theme: VerifolioTheme;
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
interface VerifolioThemeSelectorCompactProps {
  selectedColor: VerifolioThemeColor;
  onColorChange: (color: VerifolioThemeColor) => void;
}

export function VerifolioThemeSelectorCompact({
  selectedColor,
  onColorChange,
}: VerifolioThemeSelectorCompactProps) {
  const themes = getAllVerifolioThemes();

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
