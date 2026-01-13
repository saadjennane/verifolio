// ============================================================================
// Proposals Types v2
// ============================================================================

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED';
export type CommentAuthorType = 'client' | 'user';

// Preset types
export type ProposalPresetId = 'classic' | 'modern' | 'minimal' | 'elegant' | 'professional' | 'creative';

export interface ProposalVisualOptions {
  showLogo: boolean;
  coverImageUrl?: string;
  showTableOfContents: boolean;
  showSectionNumbers: boolean;
  showPageNumbers: boolean;
  footerText?: string;
}

// ============================================================================
// Theme
// ============================================================================

export interface ProposalTheme {
  primaryColor: string;
  accentColor: string;
  font: string;
}

// ============================================================================
// Proposal Templates
// ============================================================================

export interface ProposalTemplate {
  id: string;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  theme: ProposalTheme;
  is_default: boolean;
  is_system: boolean;
  // Preset and visual options
  preset_id: ProposalPresetId;
  show_logo: boolean;
  cover_image_url: string | null;
  show_table_of_contents: boolean;
  show_section_numbers: boolean;
  show_page_numbers: boolean;
  footer_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalTemplateSection {
  id: string;
  template_id: string;
  title: string;
  body: string;
  position: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProposalTemplateWithSections extends ProposalTemplate {
  sections: ProposalTemplateSection[];
}

// ============================================================================
// Proposals
// ============================================================================

export interface Proposal {
  id: string;
  owner_user_id: string;
  deal_id: string;
  client_id: string;
  template_id: string;
  title: string;
  status: ProposalStatus;
  theme_override: ProposalTheme | null;
  // Preset override (per-proposal customization)
  preset_id: ProposalPresetId | null;
  visual_options_override: Partial<ProposalVisualOptions> | null;
  public_token: string;
  sent_at: string | null;
  accepted_at: string | null;
  refused_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Proposal Sections (instance-level copies)
// ============================================================================

export interface ProposalSection {
  id: string;
  proposal_id: string;
  title: string;
  body: string;
  position: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Proposal Variables
// ============================================================================

export interface ProposalVariable {
  id: string;
  proposal_id: string;
  key: string;
  value: string;
  created_at: string;
}

// ============================================================================
// Proposal with Relations
// ============================================================================

export interface ProposalWithDetails extends Proposal {
  template: ProposalTemplateWithSections;
  sections: ProposalSection[];
  variables: ProposalVariable[];
  client: {
    id: string;
    nom: string;
    email: string | null;
    type: string;
  };
  deal: {
    id: string;
    title: string;
    status: string;
  };
  recipients: ProposalRecipientWithContact[];
}

// ============================================================================
// Proposal Recipients
// ============================================================================

export interface ProposalRecipient {
  id: string;
  proposal_id: string;
  contact_id: string;
  created_at: string;
}

export interface ProposalRecipientWithContact extends ProposalRecipient {
  contact: {
    id: string;
    nom: string;
    prenom: string | null;
    civilite: string | null;
    email: string | null;
    telephone: string | null;
  };
}

// ============================================================================
// Proposal Comments
// ============================================================================

export interface ProposalComment {
  id: string;
  proposal_id: string;
  section_id: string | null;
  author_type: CommentAuthorType;
  author_name: string | null;
  body: string;
  created_at: string;
}

// ============================================================================
// Input Types
// ============================================================================

export interface ProposalTemplateCreate {
  name: string;
  description?: string;
  theme?: Partial<ProposalTheme>;
  is_default?: boolean;
}

export interface ProposalTemplateUpdate {
  name?: string;
  description?: string;
  theme?: Partial<ProposalTheme>;
  is_default?: boolean;
}

export interface ProposalTemplateSectionCreate {
  title: string;
  body: string;
  position?: number;
  is_enabled?: boolean;
}

export interface ProposalTemplateSectionUpdate {
  title?: string;
  body?: string;
  position?: number;
  is_enabled?: boolean;
}

export interface ProposalCreate {
  deal_id: string;
  client_id: string;
  template_id: string;
  title?: string;
  theme_override?: Partial<ProposalTheme>;
}

export interface ProposalUpdate {
  title?: string;
  status?: ProposalStatus;
  theme_override?: Partial<ProposalTheme>;
}

export interface ProposalSectionUpdate {
  title?: string;
  body?: string;
  position?: number;
  is_enabled?: boolean;
}

export interface ProposalVariableInput {
  key: string;
  value: string;
}

export interface ProposalListFilter {
  status?: ProposalStatus;
  client_id?: string;
  deal_id?: string;
}

// ============================================================================
// Public View Types (limited data for public access)
// ============================================================================

export interface ProposalPublicView {
  status: ProposalStatus;
  title: string;
  client_name: string;
  token: string;
  theme: ProposalTheme;
  sections: {
    id: string;
    title: string;
    body: string;
    position: number;
  }[];
  company?: {
    name: string | null;
    logo_url: string | null;
  };
  comments: ProposalComment[];
}
