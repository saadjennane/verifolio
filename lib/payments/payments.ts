import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Payment,
  PaymentWithRelations,
  PaymentCreate,
  PaymentUpdate,
  InvoicePaymentSummary,
  ClientPaymentBalance,
  MissionPaymentSummary,
} from './types';

type Supabase = SupabaseClient;

// ============================================================================
// Payment CRUD
// ============================================================================

/**
 * Create a new payment
 */
export async function createPayment(
  supabase: Supabase,
  userId: string,
  data: PaymentCreate
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  // Validation: au moins client_id ou invoice_id
  if (!data.client_id && !data.invoice_id) {
    return { success: false, error: 'client_id ou invoice_id requis' };
  }

  // Validation: montant non nul
  if (!data.amount || data.amount === 0) {
    return { success: false, error: 'Le montant doit être différent de 0' };
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      client_id: data.client_id || null,
      invoice_id: data.invoice_id || null,
      mission_id: data.mission_id || null,
      amount: data.amount,
      payment_date: data.payment_date || new Date().toISOString().split('T')[0],
      payment_method: data.payment_method || 'virement',
      payment_type: data.payment_type || 'payment',
      reference: data.reference || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('createPayment error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: payment };
}

/**
 * Update a payment
 */
export async function updatePayment(
  supabase: Supabase,
  userId: string,
  paymentId: string,
  data: PaymentUpdate
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  const { data: payment, error } = await supabase
    .from('payments')
    .update(data)
    .eq('id', paymentId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('updatePayment error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: payment };
}

/**
 * Delete a payment
 */
export async function deletePayment(
  supabase: Supabase,
  userId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', userId);

  if (error) {
    console.error('deletePayment error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get a payment by ID
 */
export async function getPayment(
  supabase: Supabase,
  userId: string,
  paymentId: string
): Promise<PaymentWithRelations | null> {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      client:clients(id, nom),
      invoice:invoices(id, numero, total_ttc),
      mission:missions(id, title)
    `)
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('getPayment error:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Payment Lists
// ============================================================================

/**
 * List payments with optional filters
 */
export async function listPayments(
  supabase: Supabase,
  userId: string,
  filters?: {
    client_id?: string;
    invoice_id?: string;
    mission_id?: string;
    payment_type?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }
): Promise<PaymentWithRelations[]> {
  let query = supabase
    .from('payments')
    .select(`
      *,
      client:clients(id, nom),
      invoice:invoices(id, numero, total_ttc),
      mission:missions(id, title)
    `)
    .eq('user_id', userId)
    .order('payment_date', { ascending: false });

  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }
  if (filters?.invoice_id) {
    query = query.eq('invoice_id', filters.invoice_id);
  }
  if (filters?.mission_id) {
    query = query.eq('mission_id', filters.mission_id);
  }
  if (filters?.payment_type) {
    query = query.eq('payment_type', filters.payment_type);
  }
  if (filters?.from_date) {
    query = query.gte('payment_date', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('payment_date', filters.to_date);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listPayments error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get payments for an invoice
 */
export async function getInvoicePayments(
  supabase: Supabase,
  userId: string,
  invoiceId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('getInvoicePayments error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get client advances (payments without invoice)
 */
export async function getClientAdvances(
  supabase: Supabase,
  userId: string,
  clientId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .is('invoice_id', null)
    .eq('payment_type', 'advance')
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('getClientAdvances error:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Summary Views
// ============================================================================

/**
 * Get invoice payment summary
 */
export async function getInvoicePaymentSummary(
  supabase: Supabase,
  userId: string,
  invoiceId: string
): Promise<InvoicePaymentSummary | null> {
  const { data, error } = await supabase
    .from('invoice_payment_summary')
    .select('*')
    .eq('user_id', userId)
    .eq('id', invoiceId)
    .single();

  if (error) {
    console.error('getInvoicePaymentSummary error:', error);
    return null;
  }

  return data;
}

/**
 * Get client payment balance
 */
export async function getClientPaymentBalance(
  supabase: Supabase,
  userId: string,
  clientId: string
): Promise<ClientPaymentBalance | null> {
  const { data, error } = await supabase
    .from('client_payment_balance')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .single();

  if (error) {
    console.error('getClientPaymentBalance error:', error);
    return null;
  }

  return data;
}

/**
 * Get mission payment summary
 */
export async function getMissionPaymentSummary(
  supabase: Supabase,
  userId: string,
  missionId: string
): Promise<MissionPaymentSummary | null> {
  const { data, error } = await supabase
    .from('mission_payment_summary')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_id', missionId)
    .single();

  if (error) {
    console.error('getMissionPaymentSummary error:', error);
    return null;
  }

  return data;
}

/**
 * Get all invoice payment summaries for a mission
 */
export async function getMissionInvoicePayments(
  supabase: Supabase,
  userId: string,
  missionId: string
): Promise<InvoicePaymentSummary[]> {
  // Get invoice IDs linked to mission
  const { data: missionInvoices, error: miError } = await supabase
    .from('mission_invoices')
    .select('invoice_id')
    .eq('mission_id', missionId);

  if (miError || !missionInvoices?.length) {
    return [];
  }

  const invoiceIds = missionInvoices.map((mi) => mi.invoice_id);

  const { data, error } = await supabase
    .from('invoice_payment_summary')
    .select('*')
    .eq('user_id', userId)
    .in('id', invoiceIds)
    .order('date_emission', { ascending: false });

  if (error) {
    console.error('getMissionInvoicePayments error:', error);
    return [];
  }

  return data || [];
}
