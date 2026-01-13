export * from './types';

import type { TemplatePreset, PresetId } from './types';
import { renderClassic } from './classic';
import { renderModern } from './modern';
import { renderMinimal } from './minimal';
import { renderElegant } from './elegant';
import { renderProfessional } from './professional';
import { renderCreative } from './creative';

/**
 * All available template presets
 */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'classic',
    name: 'Classique',
    description: 'Design traditionnel avec header horizontal, bloc client encadré et tableau bordé',
    render: renderClassic,
  },
  {
    id: 'modern',
    name: 'Moderne',
    description: 'Style contemporain avec cards arrondies, bande de couleur et tableau épuré',
    render: renderModern,
  },
  {
    id: 'minimal',
    name: 'Minimaliste',
    description: 'Design épuré avec logo centré, espaces généreux et typographie légère',
    render: renderMinimal,
  },
  {
    id: 'elegant',
    name: 'Élégant',
    description: 'Style sophistiqué avec séparateurs décoratifs et bloc client coloré',
    render: renderElegant,
  },
  {
    id: 'professional',
    name: 'Professionnel',
    description: 'Mise en page complète avec deux colonnes et mentions légales visibles',
    render: renderProfessional,
  },
  {
    id: 'creative',
    name: 'Créatif',
    description: 'Layout audacieux avec bande latérale colorée et typographie bold',
    render: renderCreative,
  },
];

/**
 * Get a specific preset by ID
 */
export function getPreset(id: PresetId | string): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find(p => p.id === id);
}

/**
 * Get the default preset (classic)
 */
export function getDefaultPreset(): TemplatePreset {
  return TEMPLATE_PRESETS[0];
}

/**
 * Check if a preset ID is valid
 */
export function isValidPresetId(id: string): id is PresetId {
  return TEMPLATE_PRESETS.some(p => p.id === id);
}
