// ============================================================================
// Subscription Types
// ============================================================================

export type SubscriptionFrequency = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled';

export type SubscriptionDueStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | null;

export type SubscriptionPaymentStatus = 'pending' | 'scheduled' | 'completed' | 'overdue';

// ============================================================================
// Subscription Entity
// ============================================================================

export interface Subscription {
  id: string;
  user_id: string;
  supplier_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  frequency_days: number | null;
  start_date: string;
  next_due_date: string;
  auto_debit: boolean;
  status: SubscriptionStatus;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithSupplier extends Subscription {
  supplier_name: string;
  supplier_email: string | null;
  due_status: SubscriptionDueStatus;
}

// ============================================================================
// Subscription Create/Update
// ============================================================================

export interface SubscriptionCreate {
  supplier_id?: string;           // Optional - created if not provided
  supplier_name?: string;         // Used to create supplier if no supplier_id
  name: string;
  amount: number;
  currency?: string;
  frequency: SubscriptionFrequency;
  frequency_days?: number;
  start_date: string;
  auto_debit?: boolean;
  notes?: string;
}

export interface SubscriptionUpdate {
  name?: string;
  amount?: number;
  currency?: string;
  frequency?: SubscriptionFrequency;
  frequency_days?: number | null;
  auto_debit?: boolean;
  notes?: string | null;
}

// ============================================================================
// Subscription Payment (from view)
// ============================================================================

export interface SubscriptionPayment {
  payment_id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  subscription_name: string;
  auto_debit: boolean;
  supplier_id: string;
  supplier_name: string;
  effective_status: SubscriptionPaymentStatus;
}

// ============================================================================
// Subscription Summary (from RPC)
// ============================================================================

export interface SubscriptionsSummary {
  total_monthly: number;
  total_yearly: number;
  active_count: number;
  pending_payments: number;
  overdue_payments: number;
}

// ============================================================================
// Labels & Constants
// ============================================================================

export const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
  custom: 'Personnalisé',
};

export const FREQUENCY_SHORT_LABELS: Record<SubscriptionFrequency, string> = {
  monthly: '/mois',
  quarterly: '/trim.',
  yearly: '/an',
  custom: '',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  cancelled: 'Résilié',
};

export const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const DUE_STATUS_LABELS: Record<NonNullable<SubscriptionDueStatus>, string> = {
  overdue: 'En retard',
  due_today: "Aujourd'hui",
  due_soon: 'Bientôt',
  upcoming: 'À venir',
};

export const DUE_STATUS_COLORS: Record<NonNullable<SubscriptionDueStatus>, string> = {
  overdue: 'text-red-600',
  due_today: 'text-orange-600',
  due_soon: 'text-amber-600',
  upcoming: 'text-gray-600',
};

export const PAYMENT_STATUS_LABELS: Record<SubscriptionPaymentStatus, string> = {
  pending: 'À payer',
  scheduled: 'Programmé',
  completed: 'Payé',
  overdue: 'En retard',
};

export const PAYMENT_STATUS_COLORS: Record<SubscriptionPaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};
