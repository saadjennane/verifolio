import type { RenderContext } from '@/lib/render/buildRenderContext';

/**
 * Preset styling options (simplified from full TemplateConfig)
 */
export interface PresetColors {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'sans' | 'serif' | 'mono';
}

/**
 * Template preset definition
 */
export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  /** Render function that generates complete HTML for this layout */
  render: (context: RenderContext, colors: PresetColors) => string;
}

/**
 * Preset IDs
 */
export type PresetId = 'classic' | 'modern' | 'minimal' | 'elegant' | 'professional' | 'creative';

/**
 * Default preset colors
 */
export const DEFAULT_PRESET_COLORS: PresetColors = {
  primaryColor: '#111111',
  accentColor: '#3b82f6',
  fontFamily: 'sans',
};
