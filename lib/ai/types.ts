// Types pour le système IA et suggestions

export type SuggestionType = 'action' | 'reminder' | 'warning' | 'optimization';

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed' | 'executed';

export type EntityType = 'deal' | 'mission' | 'client' | 'invoice' | 'review_request';

export type ActionType =
  | 'generate_invoice'
  | 'generate_quote'
  | 'send_reminder_email'
  | 'create_review_request'
  | 'add_urgent_badge'
  | 'prioritize_deal'
  | 'draft_proposal'
  | 'draft_email';

export interface AISuggestion {
  id: string;
  user_id: string;
  suggestion_type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  suggested_action: SuggestedAction | null;
  context: Record<string, any> | null;
  status: SuggestionStatus;
  dismissed_at: string | null;
  accepted_at: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestedAction {
  type: ActionType;
  [key: string]: any; // Paramètres spécifiques à chaque type d'action
}

export interface AIRule {
  id: string;
  rule_type: 'allowed' | 'forbidden' | 'requires_confirmation';
  action_category: string;
  action_name: string;
  description: string;
  requires_user_confirmation: boolean;
  created_at: string;
}

export interface AIActionLog {
  id: string;
  user_id: string;
  suggestion_id: string | null;
  action_type: string;
  action_name: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  status: 'success' | 'failed' | 'cancelled';
  user_confirmed: boolean;
  error_message: string | null;
  input_data: Record<string, any> | null;
  output_data: Record<string, any> | null;
  created_at: string;
}

// DTOs

export interface CreateSuggestionPayload {
  suggestion_type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  entity_type?: EntityType;
  entity_id?: string;
  suggested_action?: SuggestedAction;
  context?: Record<string, any>;
}

export interface UpdateSuggestionPayload {
  status?: SuggestionStatus;
}

export interface ExecuteActionPayload {
  suggestion_id: string;
  confirm: boolean;
  custom_params?: Record<string, any>;
}

export interface ListSuggestionsFilter {
  status?: SuggestionStatus;
  suggestion_type?: SuggestionType;
  priority?: SuggestionPriority;
  entity_type?: EntityType;
  entity_id?: string;
}

// Types avec relations

export interface AISuggestionWithEntity extends AISuggestion {
  entity_title?: string;
}

// Helpers de typage pour les actions spécifiques

export interface GenerateInvoiceAction extends SuggestedAction {
  type: 'generate_invoice';
  mission_id: string;
}

export interface GenerateQuoteAction extends SuggestedAction {
  type: 'generate_quote';
  deal_id: string;
}

export interface SendReminderEmailAction extends SuggestedAction {
  type: 'send_reminder_email';
  invoice_id: string;
}

export interface CreateReviewRequestAction extends SuggestedAction {
  type: 'create_review_request';
  mission_id: string;
}

export interface AddUrgentBadgeAction extends SuggestedAction {
  type: 'add_urgent_badge';
  deal_id: string;
}
