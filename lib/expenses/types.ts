// Expense Category Types
export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface CreateExpenseCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateExpenseCategoryPayload {
  name?: string;
  color?: string;
  icon?: string;
}

// Expense Types
export interface Expense {
  id: string;
  user_id: string;
  supplier_invoice_id: string | null;
  supplier_id: string | null;
  category_id: string | null;
  description: string;
  date_expense: string;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number;
  vat_enabled: boolean;
  payment_method: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExpenseListItem extends Expense {
  supplier: {
    id: string;
    nom: string;
  } | null;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface ExpenseWithRelations extends Expense {
  supplier: {
    id: string;
    nom: string;
    email: string | null;
  } | null;
  supplier_invoice: {
    id: string;
    numero: string | null;
    total_ttc: number | null;
  } | null;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  } | null;
}

export interface CreateExpensePayload {
  supplier_invoice_id?: string;
  supplier_id?: string;
  category_id?: string;
  description: string;
  date_expense: string;
  amount_ht?: number;
  amount_tva?: number;
  amount_ttc: number;
  vat_enabled?: boolean;
  payment_method?: string;
  receipt_url?: string;
  notes?: string;
}

export interface UpdateExpensePayload {
  supplier_invoice_id?: string | null;
  supplier_id?: string | null;
  category_id?: string | null;
  description?: string;
  date_expense?: string;
  amount_ht?: number | null;
  amount_tva?: number | null;
  amount_ttc?: number;
  vat_enabled?: boolean;
  payment_method?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
}

// Filter types
export interface ListExpensesFilter {
  supplier_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  payment_method?: string;
}

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'transfer', label: 'Virement' },
  { value: 'cash', label: 'Espèces' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]['value'];

// Default expense categories
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Fournitures', color: '#3B82F6', icon: 'package' },
  { name: 'Services', color: '#8B5CF6', icon: 'settings' },
  { name: 'Transport', color: '#10B981', icon: 'car' },
  { name: 'Repas', color: '#F59E0B', icon: 'utensils' },
  { name: 'Abonnements', color: '#EC4899', icon: 'refresh-cw' },
  { name: 'Matériel', color: '#6366F1', icon: 'monitor' },
  { name: 'Formation', color: '#14B8A6', icon: 'book' },
  { name: 'Autre', color: '#6B7280', icon: 'more-horizontal' },
] as const;
