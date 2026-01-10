// Supplier Consultation Types
export type ConsultationStatus = 'open' | 'closed' | 'cancelled';

export interface SupplierConsultation {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SupplierConsultationWithQuotes extends SupplierConsultation {
  quotes: SupplierQuoteListItem[];
}

export interface CreateConsultationPayload {
  title: string;
  description?: string;
}

export interface UpdateConsultationPayload {
  title?: string;
  description?: string;
  status?: ConsultationStatus;
}

// Supplier Quote Types
export type SupplierQuoteStatus = 'pending' | 'accepted' | 'rejected';

export interface SupplierQuote {
  id: string;
  user_id: string;
  consultation_id: string | null;
  supplier_id: string;
  reference: string | null;
  date_devis: string | null;
  date_validite: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  status: SupplierQuoteStatus;
  is_selected: boolean;
  vat_enabled: boolean;
  notes: string | null;
  document_url: string | null;
  ocr_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SupplierQuoteListItem extends SupplierQuote {
  supplier: {
    id: string;
    nom: string;
  } | null;
  consultation: {
    id: string;
    title: string;
  } | null;
}

export interface SupplierQuoteWithRelations extends SupplierQuote {
  supplier: {
    id: string;
    nom: string;
    email: string | null;
    vat_enabled: boolean;
  } | null;
  consultation: {
    id: string;
    title: string;
    status: ConsultationStatus;
  } | null;
}

export interface CreateSupplierQuotePayload {
  consultation_id?: string;
  supplier_id: string;
  reference?: string;
  date_devis?: string;
  date_validite?: string;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  vat_enabled?: boolean;
  notes?: string;
  document_url?: string;
  ocr_data?: Record<string, unknown>;
}

export interface UpdateSupplierQuotePayload {
  consultation_id?: string | null;
  supplier_id?: string;
  reference?: string;
  date_devis?: string;
  date_validite?: string;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  status?: SupplierQuoteStatus;
  is_selected?: boolean;
  vat_enabled?: boolean;
  notes?: string;
  document_url?: string;
  ocr_data?: Record<string, unknown>;
}

// Supplier Invoice Types
export type SupplierInvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface SupplierInvoice {
  id: string;
  user_id: string;
  supplier_id: string;
  supplier_quote_id: string | null;
  numero: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  status: SupplierInvoiceStatus;
  paid_at: string | null;
  vat_enabled: boolean;
  notes: string | null;
  document_url: string | null;
  ocr_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SupplierInvoiceListItem extends SupplierInvoice {
  supplier: {
    id: string;
    nom: string;
  } | null;
}

export interface SupplierInvoiceWithRelations extends SupplierInvoice {
  supplier: {
    id: string;
    nom: string;
    email: string | null;
    vat_enabled: boolean;
  } | null;
  supplier_quote: {
    id: string;
    reference: string | null;
  } | null;
  expenses: {
    id: string;
    description: string;
    amount_ttc: number;
  }[];
}

export interface CreateSupplierInvoicePayload {
  supplier_id: string;
  supplier_quote_id?: string;
  numero?: string;
  date_facture?: string;
  date_echeance?: string;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  vat_enabled?: boolean;
  notes?: string;
  document_url?: string;
  ocr_data?: Record<string, unknown>;
}

export interface UpdateSupplierInvoicePayload {
  supplier_id?: string;
  supplier_quote_id?: string | null;
  numero?: string;
  date_facture?: string;
  date_echeance?: string;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  status?: SupplierInvoiceStatus;
  paid_at?: string | null;
  vat_enabled?: boolean;
  notes?: string;
  document_url?: string;
  ocr_data?: Record<string, unknown>;
}

// Filter types
export interface ListConsultationsFilter {
  status?: ConsultationStatus;
}

export interface ListSupplierQuotesFilter {
  consultation_id?: string;
  supplier_id?: string;
  status?: SupplierQuoteStatus;
}

export interface ListSupplierInvoicesFilter {
  supplier_id?: string;
  status?: SupplierInvoiceStatus;
}
