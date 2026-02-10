// ============================================================================
// Payment Types
// ============================================================================

export type PaymentMethod =
  | 'virement'
  | 'cheque'
  | 'especes'
  | 'cb'
  | 'prelevement'
  | 'autre';

export type PaymentType =
  | 'payment'           // Paiement client sur facture (IN)
  | 'advance'           // Avance client (IN)
  | 'refund'            // Remboursement client (OUT)
  | 'supplier_payment'  // Paiement fournisseur (OUT)
  | 'supplier_advance'  // Avance fournisseur (OUT)
  | 'supplier_refund'   // Remboursement fournisseur (IN)
  | 'subscription';     // Paiement abonnement (OUT)

export type InvoicePaymentStatus = 'non_paye' | 'partiel' | 'paye';

// ============================================================================
// Payment Entity
// ============================================================================

export interface Payment {
  id: string;
  user_id: string;
  client_id: string | null;
  invoice_id: string | null;
  mission_id: string | null;
  supplier_id: string | null;
  supplier_invoice_id: string | null;
  deal_id: string | null;
  subscription_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithRelations extends Payment {
  client?: {
    id: string;
    nom: string;
  } | null;
  invoice?: {
    id: string;
    numero: string;
    total_ttc: number;
  } | null;
  mission?: {
    id: string;
    title: string;
  } | null;
}

// ============================================================================
// Payment Create/Update
// ============================================================================

export interface PaymentCreate {
  client_id?: string;
  invoice_id?: string;
  mission_id?: string;
  supplier_id?: string;
  supplier_invoice_id?: string;
  deal_id?: string;
  subscription_id?: string;
  amount: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  payment_type?: PaymentType;
  reference?: string;
  notes?: string;
}

export interface PaymentUpdate {
  amount?: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  payment_type?: PaymentType;
  reference?: string | null;
  notes?: string | null;
}

// ============================================================================
// Invoice Payment Summary (from view)
// ============================================================================

export interface InvoicePaymentSummary {
  id: string;
  user_id: string;
  numero: string;
  client_id: string;
  total_ttc: number;
  status: string;
  date_emission: string;
  date_echeance: string | null;
  total_paid: number;
  total_refunded: number;
  remaining: number;
  payment_status: InvoicePaymentStatus;
  payment_count: number;
}

// ============================================================================
// Client Payment Balance (from view)
// ============================================================================

export interface ClientPaymentBalance {
  client_id: string;
  user_id: string;
  nom: string;
  total_invoiced: number;
  total_paid_invoices: number;
  total_advances: number;
  total_refunds: number;
  balance: number;
}

// ============================================================================
// Mission Payment Summary (from view)
// ============================================================================

export interface MissionPaymentSummary {
  mission_id: string;
  user_id: string;
  title: string;
  client_id: string;
  mission_status: string;
  total_invoiced: number;
  total_paid: number;
  total_advances: number;
  remaining: number;
}

// ============================================================================
// Labels
// ============================================================================

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  cb: 'Carte bancaire',
  prelevement: 'Prélèvement',
  autre: 'Autre',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  payment: 'Paiement client',
  advance: 'Avance client',
  refund: 'Remboursement client',
  supplier_payment: 'Paiement fournisseur',
  supplier_advance: 'Avance fournisseur',
  supplier_refund: 'Remboursement fournisseur',
  subscription: 'Abonnement',
};

export const PAYMENT_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  non_paye: 'Non payé',
  partiel: 'Partiel',
  paye: 'Payé',
};

export const PAYMENT_STATUS_COLORS: Record<InvoicePaymentStatus, string> = {
  non_paye: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partiel: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paye: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// ============================================================================
// Unassociated Payments (for a posteriori association)
// ============================================================================

export interface UnassociatedClientPayment {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  mission_id: string | null;
  mission_title: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  reference: string | null;
  notes: string | null;
  created_at: string;
  allocated_amount: number;
  available_amount: number;
}

export interface UnassociatedSupplierPayment {
  id: string;
  user_id: string;
  supplier_id: string;
  supplier_name: string;
  mission_id: string | null;
  mission_title: string | null;
  deal_id: string | null;
  deal_name: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  reference: string | null;
  notes: string | null;
  created_at: string;
  allocated_amount: number;
  available_amount: number;
}

export interface PendingInvoice {
  id: string;
  user_id: string;
  numero: string;
  client_id: string;
  client_name: string;
  date_emission: string;
  date_echeance: string | null;
  total_ttc: number;
  total_paid: number;
  remaining: number;
  status: string;
}

export interface PendingSupplierInvoice {
  id: string;
  user_id: string;
  numero: string;
  supplier_id: string;
  supplier_name: string;
  date_facture: string;
  date_echeance: string | null;
  total_ttc: number;
  total_paid: number;
  remaining: number;
  status: string;
}

export interface PaymentAssociationResult {
  success: boolean;
  error?: string;
  allocated?: number;
  remaining?: number;
  new_status?: string;
}
