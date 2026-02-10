// Types Supabase pour Verifolio
// Ces types correspondent au schéma de la base de données

export type ClientType = 'particulier' | 'entreprise';
export type QuoteStatus = 'brouillon' | 'envoye';
export type InvoiceStatus = 'brouillon' | 'envoyee' | 'partielle' | 'payee' | 'annulee';

// Delivery Notes (Bons de livraison)
export type DeliveryNoteStatus = 'DRAFT' | 'SENT' | 'CANCELLED';

// Entity Documents (attachments)
export type DocumentEntityType = 'DEAL' | 'MISSION';
export type DocumentKind = 'PO' | 'DELIVERY_NOTE';

export interface Company {
  id: string;
  user_id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  siret: string | null;
  footer: string | null;
  logo_url: string | null;
  default_currency: string | null;
  default_tax_rate: number;
  quote_prefix: string;
  invoice_prefix: string;
  next_quote_number: number;
  next_invoice_number: number;
  invoice_number_pattern: string;
  quote_number_pattern: string;
  // Template settings
  template_primary_color: string | null;
  template_accent_color: string | null;
  template_font_family: string | null;
  template_logo_position: string | null;
  template_show_bank_details: boolean | null;
  template_show_notes: boolean | null;
  template_show_payment_conditions: boolean | null;
  template_show_client_address: boolean | null;
  template_show_client_email: boolean | null;
  template_show_client_phone: boolean | null;
  template_show_totals_tva: boolean | null;
  template_show_signature_block: boolean | null;
  template_payment_conditions_text: string | null;
  template_payment_notes_text: string | null;
  template_signature_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  type: ClientType;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  notes: string | null;
  vat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  client_id: string;
  deal_id: string; // Obligatoire - un devis doit être lié à un deal
  numero: string;
  date_emission: string;
  date_validite: string | null;
  status: QuoteStatus;
  devise: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
  pdf_url: string | null;
  vat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  tva_rate: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  ordre: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  quote_id: string | null;
  numero: string;
  date_emission: string;
  date_echeance: string | null;
  status: InvoiceStatus;
  devise: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
  pdf_url: string | null;
  vat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  tva_rate: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  ordre: number;
}

export interface ClientBalance {
  client_id: string;
  user_id: string;
  nom: string;
  total_facture: number;
  total_paye: number;
  total_restant: number;
}

// Entity Document (attachment linked to Deal or Mission)
export interface EntityDocument {
  id: string;
  user_id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  doc_kind: DocumentKind;
  file_name: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
}

// Delivery Note (Bon de livraison)
export interface DeliveryNote {
  id: string;
  user_id: string;
  mission_id: string;
  client_id: string;
  delivery_note_number: string;
  title: string;
  status: DeliveryNoteStatus;
  sent_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Types pour les formulaires (création/édition)
export interface ClientInput {
  type: ClientType;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface LineItemInput {
  description: string;
  quantite: number;
  prix_unitaire: number;
  tva_rate?: number;
}

export interface QuoteInput {
  client_id: string;
  date_emission?: string;
  date_validite?: string;
  devise?: string;
  notes?: string;
  items: LineItemInput[];
}

export interface InvoiceInput {
  client_id: string;
  quote_id?: string;
  date_emission?: string;
  date_echeance?: string;
  devise?: string;
  notes?: string;
  items: LineItemInput[];
}

// Types avec relations (pour les requêtes avec joins)
export interface QuoteWithClient extends Quote {
  client: Client;
}

export interface QuoteWithItems extends Quote {
  items: QuoteLineItem[];
}

export interface QuoteWithClientAndItems extends Quote {
  client: Client;
  items: QuoteLineItem[];
}

export interface InvoiceWithClient extends Invoice {
  client: Client;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceLineItem[];
}

export interface InvoiceWithClientAndItems extends Invoice {
  client: Client;
  items: InvoiceLineItem[];
}

// Type pour le Database Supabase
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      quotes: {
        Row: Quote;
        Insert: Omit<Quote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Quote, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      quote_line_items: {
        Row: QuoteLineItem;
        Insert: Omit<QuoteLineItem, 'id'>;
        Update: Partial<Omit<QuoteLineItem, 'id' | 'quote_id'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      invoice_line_items: {
        Row: InvoiceLineItem;
        Insert: Omit<InvoiceLineItem, 'id'>;
        Update: Partial<Omit<InvoiceLineItem, 'id' | 'invoice_id'>>;
      };
      documents: {
        Row: EntityDocument;
        Insert: Omit<EntityDocument, 'id' | 'created_at'>;
        Update: Partial<Omit<EntityDocument, 'id' | 'user_id' | 'created_at'>>;
      };
      delivery_notes: {
        Row: DeliveryNote;
        Insert: Omit<DeliveryNote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      client_balances: {
        Row: ClientBalance;
      };
    };
  };
}
