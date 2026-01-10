import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type {
  SupplierQuote,
  SupplierQuoteListItem,
  SupplierQuoteWithRelations,
  CreateSupplierQuotePayload,
  UpdateSupplierQuotePayload,
  ListSupplierQuotesFilter,
} from './types';

/**
 * Create a new supplier quote
 */
export async function createSupplierQuote(
  payload: CreateSupplierQuotePayload
): Promise<{ success: true; data: SupplierQuote } | { success: false; error: string }> {
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
      .from('supplier_quotes')
      .insert({
        user_id: user.id,
        consultation_id: payload.consultation_id || null,
        supplier_id: payload.supplier_id,
        reference: payload.reference || null,
        date_devis: payload.date_devis || null,
        date_validite: payload.date_validite || null,
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
      console.error('Error creating supplier quote:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    await logActivity({
      action: 'create',
      entity_type: 'supplier_quote',
      entity_id: data.id,
      entity_title: data.reference || `Devis fournisseur`,
    });

    return { success: true, data };
  } catch (error) {
    console.error('createSupplierQuote error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List supplier quotes with optional filters
 */
export async function listSupplierQuotes(
  filter?: ListSupplierQuotesFilter
): Promise<{ success: true; data: SupplierQuoteListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('supplier_quotes')
      .select(`
        *,
        supplier:clients(id, nom),
        consultation:supplier_consultations(id, title)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filter?.consultation_id) {
      query = query.eq('consultation_id', filter.consultation_id);
    }

    if (filter?.supplier_id) {
      query = query.eq('supplier_id', filter.supplier_id);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listSupplierQuotes error:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, data: data as SupplierQuoteListItem[] };
  } catch (error) {
    console.error('listSupplierQuotes error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get a single supplier quote by ID
 */
export async function getSupplierQuote(
  id: string
): Promise<{ success: true; data: SupplierQuoteWithRelations } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_quotes')
      .select(`
        *,
        supplier:clients(id, nom, email, vat_enabled),
        consultation:supplier_consultations(id, title, status)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return { success: false, error: 'Devis fournisseur introuvable' };
    }

    return { success: true, data: data as SupplierQuoteWithRelations };
  } catch (error) {
    console.error('getSupplierQuote error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update a supplier quote
 */
export async function updateSupplierQuote(
  id: string,
  payload: UpdateSupplierQuotePayload
): Promise<{ success: true; data: SupplierQuote } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_quotes')
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
      entity_type: 'supplier_quote',
      entity_id: data.id,
      entity_title: data.reference || 'Devis fournisseur',
    });

    return { success: true, data };
  } catch (error) {
    console.error('updateSupplierQuote error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Soft delete a supplier quote
 */
export async function deleteSupplierQuote(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get reference for activity log
    const { data: quote } = await supabase
      .from('supplier_quotes')
      .select('reference')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('supplier_quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    await logActivity({
      action: 'delete',
      entity_type: 'supplier_quote',
      entity_id: id,
      entity_title: quote?.reference || 'Devis fournisseur',
    });

    return { success: true };
  } catch (error) {
    console.error('deleteSupplierQuote error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Convert a supplier quote to an invoice
 */
export async function convertQuoteToInvoice(
  quoteId: string
): Promise<{ success: true; invoiceId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get the quote
    const { data: quote, error: quoteError } = await supabase
      .from('supplier_quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('supplier_invoices')
      .insert({
        user_id: user.id,
        supplier_id: quote.supplier_id,
        supplier_quote_id: quoteId,
        total_ht: quote.total_ht,
        total_tva: quote.total_tva,
        total_ttc: quote.total_ttc,
        vat_enabled: quote.vat_enabled,
        notes: quote.notes,
        status: 'pending',
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: 'Erreur lors de la conversion' };
    }

    // Mark quote as accepted
    await supabase
      .from('supplier_quotes')
      .update({ status: 'accepted' })
      .eq('id', quoteId);

    await logActivity({
      action: 'create',
      entity_type: 'supplier_invoice',
      entity_id: invoice.id,
      entity_title: `Facture depuis devis ${quote.reference || quoteId}`,
    });

    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error('convertQuoteToInvoice error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
