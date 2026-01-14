// Types pour le système Reviews

export type ReviewRequestStatus = 'sent' | 'pending' | 'responded';
export type ReviewRecipientStatus = 'sent' | 'opened' | 'responded';
export type ReliabilityLevel = 'low' | 'medium' | 'high';
export type MediaType = 'image' | 'video';
export type ShowRatingsMode = 'all' | 'overall_only' | 'none';

export interface ReviewRequest {
  id: string;
  user_id: string;
  invoice_id: string;
  client_id: string;
  title: string;
  context_text: string | null;
  status: ReviewRequestStatus;
  sent_at: string;
  last_reminded_at: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewRequestRecipient {
  id: string;
  review_request_id: string;
  email: string;
  contact_id: string | null;
  status: ReviewRecipientStatus;
  sent_at: string;
  responded_at: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  review_request_id: string;
  invoice_id: string;
  client_id: string;
  reviewer_name: string | null;
  reviewer_role: string | null;
  reviewer_email: string;
  reviewer_company: string | null;
  confirm_collaboration: boolean;
  consent_display_identity: boolean;
  rating_overall: number | null;
  rating_responsiveness: number | null;
  rating_quality: number | null;
  rating_requirements: number | null;
  rating_communication: number | null;
  rating_recommendation: number | null;
  comment: string;
  reliability_score: number;
  reliability_level: ReliabilityLevel;
  is_published: boolean;
  is_professional_email: boolean | null;
  publication_notified_at: string | null;
  created_at: string;
}

export interface ReviewMissionMedia {
  id: string;
  user_id: string;
  invoice_id: string;
  media_type: MediaType;
  media_url: string;
  sort_order: number;
  is_public: boolean;
  created_at: string;
}

export interface ReviewDisplayPreferences {
  user_id: string;
  show_ratings_mode: ShowRatingsMode;
  show_comment: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewCollectionItem {
  id: string;
  collection_id: string;
  review_id: string;
  sort_order: number;
}

// DTOs pour création/update

export interface CreateReviewRequestPayload {
  title: string;
  context_text?: string;
  recipients: {
    email: string;
    contact_id?: string;
  }[];
}

export interface CreateReviewPayload {
  reviewer_name?: string;
  reviewer_role?: string;
  reviewer_email: string;
  reviewer_company?: string;
  confirm_collaboration: boolean;
  consent_display_identity: boolean;
  rating_overall?: number;
  rating_responsiveness?: number;
  rating_quality?: number;
  rating_requirements?: number;
  rating_communication?: number;
  rating_recommendation?: number;
  comment: string;
}

export interface ListReviewRequestsFilter {
  status?: ReviewRequestStatus;
  client_id?: string;
  invoice_id?: string;
}

export interface AddMissionMediaPayload {
  media_type: MediaType;
  media_url: string;
  sort_order?: number;
  is_public?: boolean;
}

export interface CreateCollectionPayload {
  name: string;
  description?: string;
}

// ============================================================================
// Review Templates
// ============================================================================

export interface RatingCriterion {
  id: string;
  label: string;
  order: number;
}

export interface CheckboxField {
  id: string;
  label: string;
  order: number;
  is_visible: boolean;
}

export interface ReviewTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rating_criteria: RatingCriterion[];
  text_placeholder: string;
  low_rating_placeholder: string;
  show_text_field: boolean;
  show_low_rating_field: boolean;
  checkboxes: CheckboxField[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewTemplateInput {
  name: string;
  description?: string | null;
  rating_criteria: RatingCriterion[];
  text_placeholder?: string;
  low_rating_placeholder?: string;
  show_text_field?: boolean;
  show_low_rating_field?: boolean;
  checkboxes?: CheckboxField[];
  is_default?: boolean;
}

export interface UpdateReviewTemplateInput {
  name?: string;
  description?: string | null;
  rating_criteria?: RatingCriterion[];
  text_placeholder?: string;
  low_rating_placeholder?: string;
  show_text_field?: boolean;
  show_low_rating_field?: boolean;
  checkboxes?: CheckboxField[];
  is_default?: boolean;
}

// Valeurs par défaut
export const DEFAULT_TEXT_PLACEHOLDER = 'En quelques mots, comment s\'est passée la collaboration ?';
export const DEFAULT_LOW_RATING_PLACEHOLDER = 'Pouvez-vous nous dire ce qui pourrait être amélioré ?';

// Critères par défaut suggérés
export const DEFAULT_RATING_CRITERIA: RatingCriterion[] = [
  { id: 'quality', label: 'Qualité du travail', order: 0 },
  { id: 'communication', label: 'Communication', order: 1 },
  { id: 'deadlines', label: 'Respect des délais', order: 2 },
];

// Cases à cocher par défaut
export const DEFAULT_CHECKBOXES: CheckboxField[] = [
  { id: 'confirm_collaboration', label: 'Je confirme avoir collaboré avec ...', order: 0, is_visible: true },
  { id: 'consent_display', label: 'J\'autorise l\'affichage de mon nom et de ma fonction', order: 1, is_visible: true },
];
