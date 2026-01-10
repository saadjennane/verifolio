'use client';

import type { TemplateConfig } from '@/lib/types/settings';
import { PRESET_THEMES } from '@/lib/types/settings';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface TemplateToolbarProps {
  config: TemplateConfig;
  onChange: (config: TemplateConfig) => void;
}

export function TemplateToolbar({ config, onChange }: TemplateToolbarProps) {
  // Find current theme name
  const currentTheme = PRESET_THEMES.find(
    t => t.primary === config.primaryColor && t.accent === config.accentColor
  );

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = PRESET_THEMES.find(t => t.name === e.target.value);
    if (theme) {
      onChange({
        ...config,
        primaryColor: theme.primary,
        accentColor: theme.accent,
      });
    }
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...config,
      fontFamily: e.target.value as TemplateConfig['fontFamily'],
    });
  };

  const handleColorChange = (color: string) => {
    onChange({
      ...config,
      primaryColor: color,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-4">
      {/* Theme dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Thème</label>
        <select
          value={currentTheme?.name || ''}
          onChange={handleThemeChange}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
        >
          <option value="" disabled>Personnalisé</option>
          {PRESET_THEMES.map(theme => (
            <option key={theme.name} value={theme.name}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

      {/* Font dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Police</label>
        <select
          value={config.fontFamily}
          onChange={handleFontChange}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="system">Sans-serif</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Couleur</label>
        <ColorPicker
          value={config.primaryColor}
          onChange={handleColorChange}
        />
      </div>
    </div>
  );
}
