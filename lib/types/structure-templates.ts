// ============================================================================
// Structure Templates Types
// ============================================================================
// Templates de structure pour les propositions (différent des design templates)
// Définit la structure des pages avec placeholders

import type { ProposalPresetId } from './proposals';

// ============================================================================
// Categories
// ============================================================================

export type StructureTemplateCategory =
  | 'general'
  | 'commercial'
  | 'creative'
  | 'agency'
  | 'quote';

export const STRUCTURE_TEMPLATE_CATEGORIES: Record<StructureTemplateCategory, string> = {
  general: 'Général',
  commercial: 'Commercial',
  creative: 'Créatif',
  agency: 'Agence',
  quote: 'Devis',
};

// ============================================================================
// TipTap Content Types
// ============================================================================

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: TipTapMark[];
}

export interface TipTapContent {
  type: 'doc';
  content?: TipTapNode[];
}

// ============================================================================
// Structure Template
// ============================================================================

export interface StructureTemplate {
  id: string;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  category: StructureTemplateCategory;
  thumbnail_svg: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface StructureTemplatePage {
  id: string;
  template_id: string;
  title: string;
  sort_order: number;
  is_cover: boolean;
  content: TipTapContent;
  created_at: string;
}

export interface StructureTemplateWithPages extends StructureTemplate {
  pages: StructureTemplatePage[];
}

// ============================================================================
// API Input Types
// ============================================================================

export interface CreateProposalFromStructureInput {
  structure_template_id: string;
  design_preset_id?: ProposalPresetId;
  title?: string;
  deal_id?: string;
  client_id?: string;
}

export interface CreateStructureTemplateInput {
  name: string;
  description?: string;
  category?: StructureTemplateCategory;
  pages: {
    title: string;
    is_cover: boolean;
    content: TipTapContent;
  }[];
}

export interface DuplicateStructureTemplateInput {
  source_template_id: string;
  name: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface StructureTemplatesListResponse {
  success: boolean;
  data?: StructureTemplateWithPages[];
  error?: string;
}

export interface StructureTemplateResponse {
  success: boolean;
  data?: StructureTemplateWithPages;
  error?: string;
}
