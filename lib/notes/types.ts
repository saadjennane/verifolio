// ============================================================================
// Note Entity Types
// ============================================================================

export type NoteEntityType =
  | 'deal'
  | 'mission'
  | 'proposal'
  | 'brief'
  | 'client'
  | 'contact'
  | 'invoice'
  | 'quote'
  | 'review'
  | 'task'
  | 'supplier';

// TipTap JSON structure
export interface TipTapContent {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

// ============================================================================
// Note Entity
// ============================================================================

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  content_json: TipTapContent;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NoteLink {
  id: string;
  note_id: string;
  entity_type: NoteEntityType;
  entity_id: string;
  created_at: string;
}

// ============================================================================
// Combined Types
// ============================================================================

export interface LinkedEntity {
  type: NoteEntityType;
  id: string;
  title: string;
}

export interface NoteWithLinks extends Note {
  links: NoteLink[];
  linked_entities?: LinkedEntity[];
}

export interface NoteListItem extends Note {
  link_count: number;
  links?: NoteLink[];
}

// ============================================================================
// API Payloads
// ============================================================================

export interface CreateNotePayload {
  title?: string;
  content?: string;
  content_json?: TipTapContent;
  color?: string;
  links?: Array<{ entity_type: NoteEntityType; entity_id: string }>;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  content_json?: TipTapContent;
  color?: string;
  pinned?: boolean;
}

export interface AddLinkPayload {
  entity_type: NoteEntityType;
  entity_id: string;
}

// ============================================================================
// UI Labels
// ============================================================================

export const NOTE_ENTITY_TYPE_LABELS: Record<NoteEntityType, string> = {
  deal: 'Deal',
  mission: 'Mission',
  proposal: 'Proposition',
  brief: 'Brief',
  client: 'Client',
  contact: 'Contact',
  invoice: 'Facture',
  quote: 'Devis',
  review: 'Avis',
  task: 'Tâche',
  supplier: 'Fournisseur',
};

export const NOTE_COLORS: Record<string, { label: string; bg: string; border: string }> = {
  gray: { label: 'Gris', bg: 'bg-gray-50', border: 'border-gray-200' },
  blue: { label: 'Bleu', bg: 'bg-blue-50', border: 'border-blue-200' },
  green: { label: 'Vert', bg: 'bg-green-50', border: 'border-green-200' },
  yellow: { label: 'Jaune', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  red: { label: 'Rouge', bg: 'bg-red-50', border: 'border-red-200' },
  purple: { label: 'Violet', bg: 'bg-purple-50', border: 'border-purple-200' },
  pink: { label: 'Rose', bg: 'bg-pink-50', border: 'border-pink-200' },
  orange: { label: 'Orange', bg: 'bg-orange-50', border: 'border-orange-200' },
};
