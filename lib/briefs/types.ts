// ============================================================================
// Brief Builder Types
// ============================================================================

// Brief status enum
export type BriefStatus = 'DRAFT' | 'SENT' | 'RESPONDED';

// Question types (structure + data collection)
export type BriefQuestionType =
  // Structure blocks (no response expected)
  | 'title'
  | 'description'
  | 'separator'
  | 'media'
  // Data collection blocks
  | 'text_short'
  | 'text_long'
  | 'number'
  | 'address'
  | 'time'
  | 'date'
  | 'selection'
  | 'rating';

// Date input modes
export type DateMode = 'single' | 'range' | 'multiple' | 'flexible';

// Selection input modes
export type SelectionMode = 'dropdown' | 'radio' | 'multiple';

// Media types
export type MediaType = 'image' | 'video' | 'link';

// Question configuration (varies by type)
export interface DateConfig {
  mode: DateMode;
  flexible?: boolean;
}

export interface SelectionConfig {
  selection_type: SelectionMode;
  options: string[];
  allow_other?: boolean;
}

export interface MediaConfig {
  media_type: MediaType;
  url?: string;
  caption?: string;
}

export interface TextConfig {
  placeholder?: string;
}

export type QuestionConfig =
  | DateConfig
  | SelectionConfig
  | MediaConfig
  | TextConfig
  | Record<string, never>;

// ============================================================================
// Template Types
// ============================================================================

export interface BriefTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BriefTemplateQuestion {
  id: string;
  template_id: string;
  type: BriefQuestionType;
  label: string;
  position: number;
  is_required: boolean;
  config: QuestionConfig;
  created_at: string;
}

export interface BriefTemplateWithQuestions extends BriefTemplate {
  questions: BriefTemplateQuestion[];
}

// ============================================================================
// Brief Types
// ============================================================================

export interface Brief {
  id: string;
  user_id: string;
  deal_id: string;
  client_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  status: BriefStatus;
  public_token: string | null;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
  deleted_at: string | null;
  updated_at: string;
}

export interface BriefQuestion {
  id: string;
  brief_id: string;
  type: BriefQuestionType;
  label: string;
  position: number;
  is_required: boolean;
  config: QuestionConfig;
  created_at: string;
}

// Structured response values
export interface AddressValue {
  lieu?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
}

export interface DateRangeValue {
  start: string;
  end: string;
}

export type StructuredValue =
  | AddressValue                    // For 'address' type
  | DateRangeValue                  // For 'date' type with mode 'range'
  | string[]                        // For 'date' with mode 'multiple' or 'selection' with checkbox
  | null;

export interface BriefResponse {
  id: string;
  question_id: string;
  value: string | null;             // Simple text value
  structured_value: StructuredValue; // Complex structured value
  responded_at: string;
}

// ============================================================================
// Combined Types (with relations)
// ============================================================================

export interface BriefQuestionWithResponse extends BriefQuestion {
  response?: BriefResponse | null;
}

export interface BriefWithDetails extends Brief {
  deal: { id: string; title: string };
  client: { id: string; nom: string };
  template?: { id: string; name: string } | null;
  questions: BriefQuestionWithResponse[];
}

export interface BriefListItem extends Brief {
  deal: { id: string; title: string };
  client: { id: string; nom: string };
  question_count?: number;
  response_count?: number;
}

// ============================================================================
// API Payloads
// ============================================================================

export interface CreateBriefPayload {
  deal_id: string;
  template_id: string;
  title?: string;
}

export interface UpdateBriefPayload {
  title?: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  is_default?: boolean;
}

export interface CreateQuestionPayload {
  type: BriefQuestionType;
  label: string;
  position?: number;
  is_required?: boolean;
  config?: QuestionConfig;
}

export interface UpdateQuestionPayload {
  type?: BriefQuestionType;
  label?: string;
  position?: number;
  is_required?: boolean;
  config?: QuestionConfig;
}

export interface SubmitResponsePayload {
  question_id: string;
  value?: string | null;
  structured_value?: StructuredValue;
}

export interface SubmitBriefPayload {
  responses: SubmitResponsePayload[];
}

// ============================================================================
// Filter Types
// ============================================================================

export interface BriefListFilter {
  status?: BriefStatus;
  deal_id?: string;
  client_id?: string;
}

export interface TemplateListFilter {
  is_default?: boolean;
}

// ============================================================================
// UI Labels
// ============================================================================

export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoye',
  RESPONDED: 'Repondu',
};

export const BRIEF_STATUS_VARIANTS: Record<BriefStatus, 'gray' | 'blue' | 'green'> = {
  DRAFT: 'gray',
  SENT: 'blue',
  RESPONDED: 'green',
};

export const QUESTION_TYPE_LABELS: Record<BriefQuestionType, string> = {
  title: 'Titre',
  description: 'Description',
  separator: 'Separateur',
  media: 'Media',
  text_short: 'Texte court',
  text_long: 'Texte long',
  number: 'Nombre',
  address: 'Adresse',
  time: 'Heure',
  date: 'Date(s)',
  selection: 'Selection',
  rating: 'Importance',
};

export const QUESTION_TYPE_ICONS: Record<BriefQuestionType, string> = {
  title: 'H1',
  description: 'T',
  separator: '—',
  media: '🖼',
  text_short: 'Aa',
  text_long: '¶',
  number: '#',
  address: '📍',
  time: '🕐',
  date: '📅',
  selection: '☑',
  rating: '⭐',
};

// Check if question type expects a response
export function isDataQuestion(type: BriefQuestionType): boolean {
  return !['title', 'description', 'separator', 'media'].includes(type);
}
