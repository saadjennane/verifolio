// ============================================================================
// Verifolio Themes - Color presets for profile customization
// ============================================================================

/**
 * Available theme color IDs
 */
export type VerifolioThemeColor =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'gray';

/**
 * Theme definition with accent and background colors
 */
export interface VerifolioTheme {
  id: VerifolioThemeColor;
  name: string;
  accent: string;      // Saturated color (buttons, borders, accents)
  background: string;  // Pastel color (page background)
}

/**
 * Predefined theme palette
 * 12 colors (3 rows of 4) inspired by Google Forms
 */
export const VERIFOLIO_THEMES: Record<VerifolioThemeColor, VerifolioTheme> = {
  // Row 1: Blues & Purples
  blue: {
    id: 'blue',
    name: 'Bleu',
    accent: '#3b82f6',
    background: '#eff6ff',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    accent: '#6366f1',
    background: '#eef2ff',
  },
  purple: {
    id: 'purple',
    name: 'Violet',
    accent: '#8b5cf6',
    background: '#f5f3ff',
  },
  pink: {
    id: 'pink',
    name: 'Rose',
    accent: '#ec4899',
    background: '#fdf2f8',
  },
  // Row 2: Warm colors
  red: {
    id: 'red',
    name: 'Rouge',
    accent: '#ef4444',
    background: '#fef2f2',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    accent: '#f97316',
    background: '#fff7ed',
  },
  yellow: {
    id: 'yellow',
    name: 'Jaune',
    accent: '#eab308',
    background: '#fefce8',
  },
  lime: {
    id: 'lime',
    name: 'Lime',
    accent: '#84cc16',
    background: '#f7fee7',
  },
  // Row 3: Greens & Neutrals
  green: {
    id: 'green',
    name: 'Vert',
    accent: '#22c55e',
    background: '#f0fdf4',
  },
  teal: {
    id: 'teal',
    name: 'Turquoise',
    accent: '#14b8a6',
    background: '#f0fdfa',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    accent: '#06b6d4',
    background: '#ecfeff',
  },
  gray: {
    id: 'gray',
    name: 'Gris',
    accent: '#374151',
    background: '#f9fafb',
  },
};

/**
 * Default theme color
 */
export const DEFAULT_VERIFOLIO_THEME: VerifolioThemeColor = 'blue';

/**
 * Get theme by color ID (with fallback to blue)
 */
export function getVerifolioTheme(colorId: VerifolioThemeColor | string | null | undefined): VerifolioTheme {
  if (colorId && colorId in VERIFOLIO_THEMES) {
    return VERIFOLIO_THEMES[colorId as VerifolioThemeColor];
  }
  return VERIFOLIO_THEMES.blue;
}

/**
 * Get all themes as array (useful for selectors)
 */
export function getAllVerifolioThemes(): VerifolioTheme[] {
  return Object.values(VERIFOLIO_THEMES);
}

/**
 * Check if a color ID is valid
 */
export function isValidVerifolioThemeColor(colorId: string): colorId is VerifolioThemeColor {
  return colorId in VERIFOLIO_THEMES;
}
