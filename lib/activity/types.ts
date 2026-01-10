export type ActivityAction = 'create' | 'update' | 'delete' | 'restore';

export type ActivityEntityType =
  | 'client'
  | 'contact'
  | 'deal'
  | 'mission'
  | 'quote'
  | 'invoice'
  | 'proposal'
  | 'brief'
  | 'review_request'
  | 'supplier'
  | 'supplier_consultation'
  | 'supplier_quote'
  | 'supplier_invoice'
  | 'expense';

export type ActivitySource = 'manual' | 'assistant';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string;
  entity_title: string;
  source: ActivitySource;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
}

export interface LogActivityPayload {
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string;
  entity_title: string;
  source?: ActivitySource;
  changes?: Record<string, { old: unknown; new: unknown }>;
}
