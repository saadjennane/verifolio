// ============================================================================
// Proposal Presets - Main Export
// ============================================================================

import type { ProposalPreset, ProposalPresetId, ProposalRenderContext, ProposalTheme, ProposalVisualOptions } from './types';
import { renderClassicProposal } from './classic';
import { renderModernProposal } from './modern';
import { renderMinimalProposal } from './minimal';
import { renderElegantProposal } from './elegant';
import { renderProfessionalProposal } from './professional';
import { renderCreativeProposal } from './creative';

// Re-export types
export * from './types';

// Available proposal presets
export const PROPOSAL_PRESETS: ProposalPreset[] = [
  {
    id: 'classic',
    name: 'Classique',
    description: 'Mise en page traditionnelle avec sections numérotées',
    render: renderClassicProposal,
  },
  {
    id: 'modern',
    name: 'Moderne',
    description: 'Design contemporain avec cards et espaces généreux',
    render: renderModernProposal,
  },
  {
    id: 'minimal',
    name: 'Minimaliste',
    description: 'Ultra-épuré avec typographie légère',
    render: renderMinimalProposal,
  },
  {
    id: 'elegant',
    name: 'Élégant',
    description: 'Raffiné avec séparateurs décoratifs',
    render: renderElegantProposal,
  },
  {
    id: 'professional',
    name: 'Professionnel',
    description: 'Dense et structuré, orienté business',
    render: renderProfessionalProposal,
  },
  {
    id: 'creative',
    name: 'Créatif',
    description: 'Bande colorée latérale, mise en page audacieuse',
    render: renderCreativeProposal,
  },
];

// Get a preset by ID
export function getProposalPreset(id: ProposalPresetId): ProposalPreset | undefined {
  return PROPOSAL_PRESETS.find(p => p.id === id);
}

// Render a proposal with the specified preset
export function renderProposal(
  presetId: ProposalPresetId,
  context: ProposalRenderContext,
  theme: ProposalTheme,
  options: ProposalVisualOptions
): string {
  const preset = getProposalPreset(presetId);
  if (!preset) {
    // Fallback to classic if preset not found
    return renderClassicProposal(context, theme, options);
  }
  return preset.render(context, theme, options);
}

// Note: DEFAULT_PROPOSAL_THEME and DEFAULT_PROPOSAL_VISUAL_OPTIONS are exported from './types'
