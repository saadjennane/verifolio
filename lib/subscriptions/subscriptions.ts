import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Subscription,
  SubscriptionWithSupplier,
  SubscriptionCreate,
  SubscriptionUpdate,
  SubscriptionPayment,
  SubscriptionsSummary,
} from './types';

// ============================================================================
// List Subscriptions
// ============================================================================

export async function listSubscriptions(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    status?: 'active' | 'suspended' | 'cancelled' | 'all';
    limit?: number;
    offset?: number;
  }
): Promise<{ data: SubscriptionWithSupplier[]; error: Error | null }> {
  try {
    let query = supabase
      .from('subscriptions_with_supplier')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('listSubscriptions error:', error);
    return { data: [], error: error as Error };
  }
}

// ============================================================================
// Get Subscription by ID
// ============================================================================

export async function getSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ data: SubscriptionWithSupplier | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions_with_supplier')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('getSubscription error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Create Subscription
// ============================================================================

export async function createSubscription(
  supabase: SupabaseClient,
  userId: string,
  input: SubscriptionCreate
): Promise<{ data: Subscription | null; error: Error | null }> {
  try {
    let supplierId = input.supplier_id;

    // Si pas de supplier_id, creer le fournisseur
    if (!supplierId && input.supplier_name) {
      // Verifier si le fournisseur existe deja
      const { data: existingSupplier } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .eq('nom', input.supplier_name)
        .eq('type', 'fournisseur')
        .maybeSingle();

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        // Creer le fournisseur
        const { data: newSupplier, error: supplierError } = await supabase
          .from('clients')
          .insert({
            user_id: userId,
            nom: input.supplier_name,
            type: 'fournisseur',
          })
          .select('id')
          .single();

        if (supplierError) throw supplierError;
        supplierId = newSupplier.id;
      }
    }

    if (!supplierId) {
      throw new Error('supplier_id ou supplier_name requis');
    }

    // Calculer next_due_date
    const startDate = new Date(input.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Si start_date est dans le passe, calculer la prochaine echeance
    let nextDueDate = startDate;
    if (startDate < today) {
      nextDueDate = calculateNextDueDate(startDate, input.frequency, input.frequency_days);
      while (nextDueDate < today) {
        nextDueDate = calculateNextDueDate(nextDueDate, input.frequency, input.frequency_days);
      }
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        supplier_id: supplierId,
        name: input.name,
        amount: input.amount,
        currency: input.currency || 'MAD',
        frequency: input.frequency,
        frequency_days: input.frequency === 'custom' ? input.frequency_days : null,
        start_date: input.start_date,
        next_due_date: nextDueDate.toISOString().split('T')[0],
        auto_debit: input.auto_debit ?? false,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('createSubscription error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Update Subscription
// ============================================================================

export async function updateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  updates: SubscriptionUpdate
): Promise<{ data: Subscription | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('updateSubscription error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Suspend Subscription
// ============================================================================

export async function suspendSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'suspended' })
      .eq('id', subscriptionId)
      .eq('status', 'active');

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('suspendSubscription error:', error);
    return { success: false, error: error as Error };
  }
}

// ============================================================================
// Resume Subscription
// ============================================================================

export async function resumeSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subscriptionId)
      .eq('status', 'suspended');

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('resumeSubscription error:', error);
    return { success: false, error: error as Error };
  }
}

// ============================================================================
// Cancel Subscription
// ============================================================================

export async function cancelSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .neq('status', 'cancelled');

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('cancelSubscription error:', error);
    return { success: false, error: error as Error };
  }
}

// ============================================================================
// Get Subscriptions Summary
// ============================================================================

export async function getSubscriptionsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: SubscriptionsSummary | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_subscriptions_summary', {
      p_user_id: userId,
    });

    if (error) throw error;

    return {
      data: data?.[0] || {
        total_monthly: 0,
        total_yearly: 0,
        active_count: 0,
        pending_payments: 0,
        overdue_payments: 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('getSubscriptionsSummary error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Get Subscription Payments
// ============================================================================

export async function getSubscriptionPayments(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ data: SubscriptionPayment[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('getSubscriptionPayments error:', error);
    return { data: [], error: error as Error };
  }
}

// ============================================================================
// Complete Payment (mark as paid)
// ============================================================================

export async function completeSubscriptionPayment(
  supabase: SupabaseClient,
  paymentId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('complete_subscription_payment', {
      p_payment_id: paymentId,
    });

    if (error) throw error;

    return { success: data === true, error: null };
  } catch (error) {
    console.error('completeSubscriptionPayment error:', error);
    return { success: false, error: error as Error };
  }
}

// ============================================================================
// Generate Subscription Payments
// ============================================================================

export async function generateSubscriptionPayments(
  supabase: SupabaseClient,
  userId?: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('generate_subscription_payments', {
      p_user_id: userId || null,
    });

    if (error) throw error;

    return { count: data || 0, error: null };
  } catch (error) {
    console.error('generateSubscriptionPayments error:', error);
    return { count: 0, error: error as Error };
  }
}

// ============================================================================
// Helper: Calculate next due date
// ============================================================================

function calculateNextDueDate(
  currentDate: Date,
  frequency: string,
  frequencyDays?: number
): Date {
  const result = new Date(currentDate);

  switch (frequency) {
    case 'monthly':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'quarterly':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'yearly':
      result.setFullYear(result.getFullYear() + 1);
      break;
    case 'custom':
      if (frequencyDays) {
        result.setDate(result.getDate() + frequencyDays);
      } else {
        result.setMonth(result.getMonth() + 1);
      }
      break;
    default:
      result.setMonth(result.getMonth() + 1);
  }

  return result;
}
