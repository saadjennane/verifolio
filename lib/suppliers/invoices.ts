import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type {
  SupplierInvoice,
  SupplierInvoiceListItem,
  SupplierInvoiceWithRelations,
  CreateSupplierInvoicePayload,
  UpdateSupplierInvoicePayload,
  ListSupplierInvoicesFilter,
} from './types';

/**
 * Create a new supplier invoice
 */
export async function createSupplierInvoice(
  payload: CreateSupplierInvoicePayload
): Promise<{ success: true; data: SupplierInvoice } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get supplier's default VAT setting if not provided
    let vatEnabled = payload.vat_enabled;
    if (vatEnabled === undefined) {
      const { data: supplier } = await supabase
        .from('clients')
        .select('vat_enabled')
        .eq('id', payload.supplier_id)
        .single();
      vatEnabled = supplier?.vat_enabled ?? true;
    }

    const { data, error } = await supabase
      .from('supplier_invoices')
      .insert({
        user_id: user.id,
        supplier_id: payload.supplier_id,
        supplier_quote_id: payload.supplier_quote_id || null,
        numero: payload.numero || null,
        date_facture: payload.date_facture || null,
        date_echeance: payload.date_echeance || null,
        total_ht: payload.total_ht || null,
        total_tva: payload.total_tva || null,
        total_ttc: payload.total_ttc || null,
        vat_enabled: vatEnabled,
        notes: payload.notes || null,
        document_url: payload.document_url || null,
        ocr_data: payload.ocr_data || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating supplier invoice:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    await logActivity({
      action: 'create',
      entity_type: 'supplier_invoice',
      entity_id: data.id,
      entity_title: data.numero || `Facture fournisseur`,
    });

    return { success: true, data };
  } catch (error) {
    console.error('createSupplierInvoice error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List supplier invoices with optional filters
 */
export async function listSupplierInvoices(
  filter?: ListSupplierInvoicesFilter
): Promise<{ success: true; data: SupplierInvoiceListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('supplier_invoices')
      .select(`
        *,
        supplier:clients(id, nom)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filter?.supplier_id) {
      query = query.eq('supplier_id', filter.supplier_id);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listSupplierInvoices error:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, data: data as SupplierInvoiceListItem[] };
  } catch (error) {
    console.error('listSupplierInvoices error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get a single supplier invoice by ID
 */
export async function getSupplierInvoice(
  id: string
): Promise<{ success: true; data: SupplierInvoiceWithRelations } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_invoices')
      .select(`
        *,
        supplier:clients(id, nom, email, vat_enabled),
        supplier_quote:supplier_quotes(id, reference),
        expenses(id, description, amount_ttc)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return { success: false, error: 'Facture fournisseur introuvable' };
    }

    return { success: true, data: data as SupplierInvoiceWithRelations };
  } catch (error) {
    console.error('getSupplierInvoice error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update a supplier invoice
 */
export async function updateSupplierInvoice(
  id: string,
  payload: UpdateSupplierInvoicePayload
): Promise<{ success: true; data: SupplierInvoice } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_invoices')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    await logActivity({
      action: 'update',
      entity_type: 'supplier_invoice',
      entity_id: data.id,
      entity_title: data.numero || 'Facture fournisseur',
    });

    return { success: true, data };
  } catch (error) {
    console.error('updateSupplierInvoice error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Soft delete a supplier invoice
 */
export async function deleteSupplierInvoice(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get numero for activity log
    const { data: invoice } = await supabase
      .from('supplier_invoices')
      .select('numero')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('supplier_invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    await logActivity({
      action: 'delete',
      entity_type: 'supplier_invoice',
      entity_id: id,
      entity_title: invoice?.numero || 'Facture fournisseur',
    });

    return { success: true };
  } catch (error) {
    console.error('deleteSupplierInvoice error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Mark a supplier invoice as paid
 */
export async function markSupplierInvoicePaid(
  id: string
): Promise<{ success: true; data: SupplierInvoice } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    await logActivity({
      action: 'update',
      entity_type: 'supplier_invoice',
      entity_id: data.id,
      entity_title: `${data.numero || 'Facture'} marquée payée`,
    });

    return { success: true, data };
  } catch (error) {
    console.error('markSupplierInvoicePaid error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Create an expense from a supplier invoice
 */
export async function createExpenseFromInvoice(
  invoiceId: string,
  categoryId?: string
): Promise<{ success: true; expenseId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('supplier_invoices')
      .select('*, supplier:clients(nom)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: 'Facture introuvable' };
    }

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        supplier_invoice_id: invoiceId,
        supplier_id: invoice.supplier_id,
        category_id: categoryId || null,
        description: `Facture ${invoice.numero || ''} - ${invoice.supplier?.nom || 'Fournisseur'}`.trim(),
        date_expense: invoice.date_facture || new Date().toISOString().split('T')[0],
        amount_ht: invoice.total_ht,
        amount_tva: invoice.total_tva,
        amount_ttc: invoice.total_ttc || 0,
        vat_enabled: invoice.vat_enabled,
      })
      .select()
      .single();

    if (expenseError || !expense) {
      return { success: false, error: 'Erreur lors de la création de la dépense' };
    }

    await logActivity({
      action: 'create',
      entity_type: 'expense',
      entity_id: expense.id,
      entity_title: expense.description,
    });

    return { success: true, expenseId: expense.id };
  } catch (error) {
    console.error('createExpenseFromInvoice error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
