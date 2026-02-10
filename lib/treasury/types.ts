// ============================================================================
// Treasury Types
// ============================================================================

import type { PaymentMethod, PaymentType } from '@/lib/payments/types';

// ============================================================================
// Direction & Movement Types
// ============================================================================

export type MovementDirection = 'in' | 'out';

export type MovementType =
  | 'client_payment'    // Paiement client (IN)
  | 'client_refund'     // Remboursement client (OUT)
  | 'supplier_payment'  // Paiement fournisseur (OUT)
  | 'supplier_refund';  // Remboursement fournisseur (IN)

export type DocumentType = 'invoice' | 'supplier_invoice';

// ============================================================================
// Treasury Movement (from view)
// ============================================================================

export interface TreasuryMovement {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  reference: string | null;
  notes: string | null;
  direction: MovementDirection;
  movement_type: MovementType;
  invoice_id: string | null;
  supplier_invoice_id: string | null;
  counterpart_id: string | null;
  counterpart_name: string | null;
  document_numero: string | null;
  document_type: DocumentType | null;
  mission_id: string | null;
  created_at: string;
}

// ============================================================================
// Treasury KPIs
// ============================================================================

export interface TreasuryKPIs {
  total_encaisse: number;           // Total encaisse (IN) pour la periode
  total_decaisse: number;           // Total decaisse (OUT) pour la periode
  solde_net: number;                // Net = IN - OUT
  a_encaisser: number;              // Factures clients non payees
  a_payer: number;                  // Factures fournisseurs non payees
  en_retard_encaissement: number;   // Factures clients echues non payees
  en_retard_paiement: number;       // Factures fournisseurs echues non payees
  a_venir_encaissement: number;     // Factures clients non echues
  a_venir_paiement: number;         // Factures fournisseurs non echues
}

// ============================================================================
// Treasury Filters
// ============================================================================

export interface TreasuryFilters {
  from_date?: string;
  to_date?: string;
  direction?: MovementDirection;
  movement_type?: MovementType;
  payment_method?: PaymentMethod;
  counterpart_id?: string;
  search?: string;
}

// ============================================================================
// Period Presets
// ============================================================================

export type PeriodPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

// ============================================================================
// Create Payloads
// ============================================================================

export interface CreateEncaissementPayload {
  invoice_id?: string;
  client_id?: string;
  mission_id?: string;
  amount: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  payment_type?: 'payment' | 'advance';
  reference?: string;
  notes?: string;
}

export interface CreateDecaissementPayload {
  supplier_invoice_id?: string;
  supplier_id?: string;
  amount: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  payment_type?: 'supplier_payment' | 'supplier_advance';
  reference?: string;
  notes?: string;
}

// ============================================================================
// Pending Invoice (for modals)
// ============================================================================

export interface PendingClientInvoice {
  id: string;
  numero: string;
  client_id: string;
  client_name: string;
  total_ttc: number;
  remaining: number;
  date_echeance: string | null;
}

export interface PendingSupplierInvoice {
  id: string;
  numero: string | null;
  supplier_id: string;
  supplier_name: string;
  total_ttc: number;
  remaining: number;
  date_echeance: string | null;
}

// ============================================================================
// Labels & Constants
// ============================================================================

export const DIRECTION_LABELS: Record<MovementDirection, string> = {
  in: 'Encaissement',
  out: 'Decaissement',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  client_payment: 'Paiement client',
  client_refund: 'Remboursement client',
  supplier_payment: 'Paiement fournisseur',
  supplier_refund: 'Remboursement fournisseur',
};

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  this_week: 'Cette semaine',
  this_month: 'Ce mois',
  last_month: 'Mois dernier',
  this_quarter: 'Ce trimestre',
  this_year: 'Cette annee',
  custom: 'Personnalise',
};

export const DIRECTION_COLORS: Record<MovementDirection, { text: string; bg: string }> = {
  in: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  out: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
};
