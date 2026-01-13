// ============================================================================
// Settings & Templates Types
// ============================================================================

// Enums matching database
export type CustomFieldScope = 'company' | 'client' | 'document';
export type CustomFieldType = 'text';
export type EntityType = 'company' | 'client' | 'quote' | 'invoice';
export type ClientType = 'particulier' | 'entreprise';
export type DocType = 'quote' | 'invoice';
export type TemplateZone = 'header' | 'doc_info' | 'client' | 'items' | 'totals' | 'footer';
export type TemplateBlockType =
  | 'company_logo'
  | 'company_contact'
  | 'company_field'
  | 'client_contact'
  | 'client_field'
  | 'document_field'
  | 'legal_text'
  | 'notes'
  | 'items_table'
  | 'totals_table';

// ============================================================================
// Company
// ============================================================================

export type DateFormat = 'dd/mm/yyyy' | 'dd/mm/yy' | 'mm/dd/yyyy' | 'mm/dd/yy';

export interface Company {
  id: string;
  user_id: string;
  display_name: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  default_currency: string;
  default_tax_rate: number;
  date_format: DateFormat;
  invoice_number_pattern: string;
  quote_number_pattern: string;
  // Template styling
  template_primary_color: string;
  template_accent_color: string;
  template_font_family: 'system' | 'serif' | 'mono';
  template_logo_position: 'left' | 'center' | 'right';
  template_show_bank_details: boolean;
  template_show_notes: boolean;
  template_show_payment_conditions: boolean;
  // Client block options
  template_client_block_style: 'minimal' | 'bordered' | 'filled';
  template_show_client_address: boolean;
  template_show_client_email: boolean;
  template_show_client_phone: boolean;
  // JSON array of custom field keys to hide
  template_hidden_client_fields: string[] | null;
  created_at: string;
  updated_at: string;
}

// Preset layout IDs
export type PresetLayoutId = 'classic' | 'modern' | 'minimal' | 'elegant' | 'professional' | 'creative';

// Template configuration for rendering
export interface TemplateConfig {
  // Preset layout (default: classic)
  presetId: PresetLayoutId;
  primaryColor: string;
  accentColor: string;
  fontFamily: 'system' | 'serif' | 'mono';
  logoPosition: 'left' | 'center' | 'right';
  showBankDetails: boolean;
  showNotes: boolean;
  showPaymentConditions: boolean;
  // Client block options
  clientBlockStyle: 'minimal' | 'bordered' | 'filled';
  clientBlockLabel: string; // Custom label for client block (default: "DESTINATAIRE")
  showClientAddress: boolean;
  showClientEmail: boolean;
  showClientPhone: boolean;
  // Array of custom field keys to hide (empty = show all)
  hiddenClientFields: string[];
  // Doc info block options
  docInfoDateLabel: string; // Custom label for date (default: "Date d'émission")
  docInfoDueDateLabel: string; // Custom label for due date (default: "Date d'échéance")
  showDocInfoDate: boolean;
  showDocInfoDueDate: boolean;
  // Items table options
  itemsColDescriptionLabel: string;
  itemsColQtyLabel: string;
  itemsColPriceLabel: string;
  itemsColTvaLabel: string;
  itemsColTotalLabel: string;
  showItemsColQty: boolean;
  showItemsColPrice: boolean;
  showItemsColTva: boolean;
  showItemsColTotal: boolean;
  // Totals options
  totalsHtLabel: string;
  totalsDiscountLabel: string;
  totalsTvaLabel: string;
  totalsTtcLabel: string;
  totalsDueLabel: string;
  showTotalsDiscount: boolean;
  showTotalsTva: boolean;
  showTotalsInWords: boolean;
  // Payment block options
  paymentBankLabel: string;
  paymentBankText: string;
  paymentConditionsLabel: string;
  paymentNotesLabel: string;
  paymentConditionsText: string;
  paymentNotesText: string;
  // Footer options
  showFooterIdentity: boolean;
  showFooterLegal: boolean;
  showFooterContact: boolean;
  footerCustomText: string;
  // Signature options
  showSignatureBlock: boolean;
  signatureLabel: string;
}

// Default template config
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  presetId: 'classic',
  primaryColor: '#1e40af',
  accentColor: '#3b82f6',
  fontFamily: 'system',
  logoPosition: 'left',
  showBankDetails: true,
  showNotes: true,
  showPaymentConditions: true,
  // Client block defaults
  clientBlockStyle: 'bordered',
  clientBlockLabel: 'DESTINATAIRE',
  showClientAddress: true,
  showClientEmail: true,
  showClientPhone: true,
  hiddenClientFields: [],
  // Doc info block defaults
  docInfoDateLabel: "Date d'émission",
  docInfoDueDateLabel: "Date d'échéance",
  showDocInfoDate: true,
  showDocInfoDueDate: true,
  // Items table defaults
  itemsColDescriptionLabel: 'Désignation',
  itemsColQtyLabel: 'Qté',
  itemsColPriceLabel: 'Prix unitaire',
  itemsColTvaLabel: 'TVA',
  itemsColTotalLabel: 'Total',
  showItemsColQty: true,
  showItemsColPrice: true,
  showItemsColTva: false,
  showItemsColTotal: true,
  // Totals defaults
  totalsHtLabel: 'Total HT',
  totalsDiscountLabel: 'Remise',
  totalsTvaLabel: 'TVA',
  totalsTtcLabel: 'Total TTC',
  totalsDueLabel: 'Montant total dû',
  showTotalsDiscount: true,
  showTotalsTva: true,
  showTotalsInWords: true,
  // Payment block defaults
  paymentBankLabel: 'Coordonnées bancaires',
  paymentBankText: '',
  paymentConditionsLabel: 'Conditions de paiement',
  paymentNotesLabel: 'Notes',
  paymentConditionsText: '',
  paymentNotesText: '',
  // Footer defaults
  showFooterIdentity: true,
  showFooterLegal: true,
  showFooterContact: true,
  footerCustomText: '',
  // Signature defaults
  showSignatureBlock: true,
  signatureLabel: 'Cachet et signature',
};

// Preset themes
export const PRESET_THEMES = [
  { name: 'Bleu Pro', primary: '#1e40af', accent: '#3b82f6' },
  { name: 'Vert Nature', primary: '#166534', accent: '#22c55e' },
  { name: 'Rouge Moderne', primary: '#b91c1c', accent: '#ef4444' },
  { name: 'Violet Élégant', primary: '#7c3aed', accent: '#a78bfa' },
  { name: 'Orange Dynamique', primary: '#c2410c', accent: '#f97316' },
  { name: 'Gris Sobre', primary: '#374151', accent: '#6b7280' },
] as const;

export type CompanyPatch = Partial<Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// Custom Fields
// ============================================================================

export interface CustomField {
  id: string;
  user_id: string;
  scope: CustomFieldScope;
  key: string;
  label: string;
  field_type: CustomFieldType;
  is_active: boolean;
  is_visible_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldCreate {
  scope: CustomFieldScope;
  key: string;
  label: string;
  field_type?: CustomFieldType;
  is_active?: boolean;
  is_visible_default?: boolean;
}

export interface CustomFieldValue {
  id: string;
  user_id: string;
  field_id: string;
  entity_type: EntityType;
  entity_id: string;
  value_text: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Templates
// ============================================================================

export interface Template {
  id: string;
  user_id: string;
  doc_type: DocType;
  name: string;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateBlock {
  id: string;
  template_id: string;
  zone: TemplateZone;
  block_type: TemplateBlockType;
  field_id: string | null;
  label_override: string | null;
  is_visible: boolean;
  sort_order: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TemplateBlockPayload {
  id?: string;
  zone: TemplateZone;
  block_type: TemplateBlockType;
  field_id?: string | null;
  label_override?: string | null;
  is_visible?: boolean;
  sort_order?: number;
  config?: Record<string, unknown>;
}

// Template with blocks
export interface TemplateWithBlocks extends Template {
  blocks: TemplateBlock[];
}
