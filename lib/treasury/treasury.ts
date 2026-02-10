import { createClient } from '@/lib/supabase/client';
import type {
  TreasuryMovement,
  TreasuryKPIs,
  TreasuryFilters,
  CreateEncaissementPayload,
  CreateDecaissementPayload,
  PendingClientInvoice,
  PendingSupplierInvoice,
} from './types';

// ============================================================================
// Treasury KPIs
// ============================================================================

export async function getTreasuryKPIs(
  fromDate?: string,
  toDate?: string
): Promise<{ success: true; data: TreasuryKPIs } | { success: false; error: string }> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data, error } = await supabase.rpc('get_treasury_kpis', {
    p_user_id: userData.user.id,
    p_from_date: fromDate || null,
    p_to_date: toDate || null,
  });

  if (error) {
    console.error('getTreasuryKPIs error:', error);
    return { success: false, error: error.message };
  }

  // RPC returns an array, take first element
  const kpis = data?.[0] || {
    total_encaisse: 0,
    total_decaisse: 0,
    solde_net: 0,
    a_encaisser: 0,
    a_payer: 0,
    en_retard_encaissement: 0,
    en_retard_paiement: 0,
    a_venir_encaissement: 0,
    a_venir_paiement: 0,
  };

  return { success: true, data: kpis };
}

// ============================================================================
// Treasury Movements
// ============================================================================

export async function listTreasuryMovements(
  filters?: TreasuryFilters
): Promise<{ success: true; data: TreasuryMovement[] } | { success: false; error: string }> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Non authentifie' };
  }

  let query = supabase
    .from('treasury_movements')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.from_date) {
    query = query.gte('date', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('date', filters.to_date);
  }
  if (filters?.direction) {
    query = query.eq('direction', filters.direction);
  }
  if (filters?.movement_type) {
    query = query.eq('movement_type', filters.movement_type);
  }
  if (filters?.payment_method) {
    query = query.eq('payment_method', filters.payment_method);
  }
  if (filters?.counterpart_id) {
    query = query.eq('counterpart_id', filters.counterpart_id);
  }
  if (filters?.search) {
    query = query.or(
      `reference.ilike.%${filters.search}%,notes.ilike.%${filters.search}%,counterpart_name.ilike.%${filters.search}%,document_numero.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('listTreasuryMovements error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

// ============================================================================
// Encaissement (Client payment IN)
// ============================================================================

export async function createEncaissement(
  payload: CreateEncaissementPayload
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Validation
  if (!payload.client_id && !payload.invoice_id) {
    return { success: false, error: 'Client ou facture requis' };
  }
  if (!payload.amount || payload.amount <= 0) {
    return { success: false, error: 'Montant invalide (doit etre > 0)' };
  }

  // Si invoice_id fourni, verifier que le montant ne depasse pas le reste
  if (payload.invoice_id) {
    const { data: summary } = await supabase
      .from('invoice_payment_summary')
      .select('remaining')
      .eq('id', payload.invoice_id)
      .single();

    if (summary && payload.amount > summary.remaining) {
      return {
        success: false,
        error: `Montant depasse le reste a encaisser (${summary.remaining} EUR)`,
      };
    }
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userData.user.id,
      client_id: payload.client_id || null,
      invoice_id: payload.invoice_id || null,
      mission_id: payload.mission_id || null,
      amount: payload.amount,
      payment_date: payload.payment_date || new Date().toISOString().split('T')[0],
      payment_method: payload.payment_method || 'virement',
      payment_type: payload.payment_type || 'payment',
      reference: payload.reference || null,
      notes: payload.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('createEncaissement error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ============================================================================
// Decaissement (Supplier payment OUT)
// ============================================================================

export async function createDecaissement(
  payload: CreateDecaissementPayload
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Validation
  if (!payload.supplier_id && !payload.supplier_invoice_id) {
    return { success: false, error: 'Fournisseur ou facture fournisseur requis' };
  }
  if (!payload.amount || payload.amount <= 0) {
    return { success: false, error: 'Montant invalide (doit etre > 0)' };
  }

  // Si supplier_invoice_id fourni, verifier que le montant ne depasse pas le reste
  if (payload.supplier_invoice_id) {
    const { data: summary } = await supabase
      .from('supplier_invoice_payment_summary')
      .select('remaining')
      .eq('id', payload.supplier_invoice_id)
      .single();

    if (summary && payload.amount > summary.remaining) {
      return {
        success: false,
        error: `Montant depasse le reste a payer (${summary.remaining} EUR)`,
      };
    }
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userData.user.id,
      supplier_id: payload.supplier_id || null,
      supplier_invoice_id: payload.supplier_invoice_id || null,
      amount: payload.amount,
      payment_date: payload.payment_date || new Date().toISOString().split('T')[0],
      payment_method: payload.payment_method || 'virement',
      payment_type: payload.payment_type || 'supplier_payment',
      reference: payload.reference || null,
      notes: payload.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('createDecaissement error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ============================================================================
// Pending Invoices
// ============================================================================

export async function getPendingClientInvoices(): Promise<
  { success: true; data: PendingClientInvoice[] } | { success: false; error: string }
> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data, error } = await supabase
    .from('invoice_payment_summary')
    .select(
      `
      id,
      numero,
      client_id,
      total_ttc,
      remaining,
      date_echeance,
      client:clients!invoice_payment_summary_client_id_fkey(nom)
    `
    )
    .eq('user_id', userData.user.id)
    .neq('payment_status', 'paye')
    .not('status', 'in', '("brouillon","annulee")')
    .order('date_echeance', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('getPendingClientInvoices error:', error);
    return { success: false, error: error.message };
  }

  const invoices: PendingClientInvoice[] = (data || []).map((inv) => {
    const client = inv.client as unknown as { nom: string } | null;
    return {
      id: inv.id,
      numero: inv.numero,
      client_id: inv.client_id,
      client_name: client?.nom || 'Client inconnu',
      total_ttc: inv.total_ttc,
      remaining: inv.remaining,
      date_echeance: inv.date_echeance,
    };
  });

  return { success: true, data: invoices };
}

export async function getPendingSupplierInvoices(): Promise<
  { success: true; data: PendingSupplierInvoice[] } | { success: false; error: string }
> {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data, error } = await supabase
    .from('supplier_invoice_payment_summary')
    .select('*')
    .eq('user_id', userData.user.id)
    .neq('payment_status', 'paye')
    .neq('status', 'cancelled')
    .order('date_echeance', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('getPendingSupplierInvoices error:', error);
    return { success: false, error: error.message };
  }

  const invoices: PendingSupplierInvoice[] = (data || []).map((inv) => ({
    id: inv.id,
    numero: inv.numero,
    supplier_id: inv.supplier_id,
    supplier_name: inv.supplier_name || 'Fournisseur inconnu',
    total_ttc: inv.total_ttc || 0,
    remaining: inv.remaining || inv.total_ttc || 0,
    date_echeance: inv.date_echeance,
  }));

  return { success: true, data: invoices };
}

// ============================================================================
// Helpers
// ============================================================================

export function getPeriodDates(preset: string): { from: string; to: string } {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr };

    case 'this_week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      return { from: weekStart.toISOString().split('T')[0], to: todayStr };
    }

    case 'this_month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: monthStart.toISOString().split('T')[0], to: todayStr };
    }

    case 'last_month': {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        from: lastMonthStart.toISOString().split('T')[0],
        to: lastMonthEnd.toISOString().split('T')[0],
      };
    }

    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      return { from: quarterStart.toISOString().split('T')[0], to: todayStr };
    }

    case 'this_year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { from: yearStart.toISOString().split('T')[0], to: todayStr };
    }

    default:
      return { from: todayStr, to: todayStr };
  }
}
