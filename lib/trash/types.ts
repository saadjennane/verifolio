// Types for the trash/soft-delete system

export type TrashEntityType =
  | 'client'
  | 'contact'
  | 'deal'
  | 'mission'
  | 'quote'
  | 'invoice'
  | 'proposal';

export interface TrashedItem {
  id: string;
  entity_type: TrashEntityType;
  title: string;
  deleted_at: string;
  days_remaining: number;
  // Optional extra info
  subtitle?: string;
}

export interface TrashListResponse {
  items: TrashedItem[];
  total: number;
}

// Labels for entity types (French)
export const ENTITY_TYPE_LABELS: Record<TrashEntityType, string> = {
  client: 'Client',
  contact: 'Contact',
  deal: 'Deal',
  mission: 'Mission',
  quote: 'Devis',
  invoice: 'Facture',
  proposal: 'Proposition',
};

// Retention period in days
export const TRASH_RETENTION_DAYS = 30;

// Calculate days remaining before permanent deletion
export function calculateDaysRemaining(deletedAt: string): number {
  const deletedDate = new Date(deletedAt);
  const now = new Date();
  const diffMs = now.getTime() - deletedDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, TRASH_RETENTION_DAYS - diffDays);
}
