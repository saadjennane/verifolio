// ============================================================================
// Proposal Presets Types
// ============================================================================

export type ProposalPresetId = 'classic' | 'modern' | 'minimal' | 'elegant' | 'professional' | 'creative';

export interface ProposalTheme {
  primaryColor: string;
  accentColor: string;
  fontFamily: 'sans' | 'serif' | 'mono';
}

export interface ProposalVisualOptions {
  showLogo: boolean;
  showLogoOnAllPages: boolean;
  coverImageUrl?: string;
  showTableOfContents: boolean;
  showSectionNumbers: boolean;
  showPageNumbers: boolean;
  footerText?: string;
  watermark?: {
    enabled: boolean;
    text: string;
    opacity: number; // 0-100
  };
}

export interface ProposalSection {
  id: string;
  title: string;
  body: string;
  position: number;
  is_enabled: boolean;
}

export interface ProposalRenderContext {
  title: string;
  sections: ProposalSection[];
  company: {
    name: string;
    logoUrl?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  client?: {
    name: string;
    contactName?: string;
    email?: string;
    address?: string;
  };
}

export interface ProposalPreset {
  id: ProposalPresetId;
  name: string;
  description: string;
  render: (
    context: ProposalRenderContext,
    theme: ProposalTheme,
    options: ProposalVisualOptions
  ) => string;
}

export const DEFAULT_PROPOSAL_THEME: ProposalTheme = {
  primaryColor: '#111111',
  accentColor: '#3B82F6',
  fontFamily: 'sans',
};

export const DEFAULT_PROPOSAL_VISUAL_OPTIONS: ProposalVisualOptions = {
  showLogo: true,
  showLogoOnAllPages: false,
  showTableOfContents: false,
  showSectionNumbers: true,
  showPageNumbers: true,
  footerText: '',
  watermark: {
    enabled: false,
    text: 'BROUILLON',
    opacity: 10,
  },
};
