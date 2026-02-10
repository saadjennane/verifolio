import { createClient } from '@/lib/supabase/server';
import type {
  SupplierDeliveryNote,
  SupplierDeliveryNoteWithRelations,
  SupplierDeliveryNoteListItem,
  CreateSupplierDeliveryNotePayload,
  UpdateSupplierDeliveryNotePayload,
  ListSupplierDeliveryNotesFilter,
} from './types';

/**
 * Create a new supplier delivery note
 */
export async function createSupplierDeliveryNote(
  payload: CreateSupplierDeliveryNotePayload
): Promise<{ success: true; data: SupplierDeliveryNote } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_delivery_notes')
      .insert({
        user_id: user.id,
        supplier_id: payload.supplier_id,
        supplier_quote_id: payload.supplier_quote_id || null,
        purchase_order_id: payload.purchase_order_id || null,
        reference: payload.reference || null,
        date_reception: payload.date_reception || new Date().toISOString().split('T')[0],
        notes: payload.notes || null,
        document_url: payload.document_url || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating supplier delivery note:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in createSupplierDeliveryNote:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List supplier delivery notes with optional filters
 */
export async function listSupplierDeliveryNotes(
  filter?: ListSupplierDeliveryNotesFilter
): Promise<{ success: true; data: SupplierDeliveryNoteListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('supplier_delivery_notes')
      .select(`
        *,
        supplier:clients!supplier_delivery_notes_supplier_id_fkey(id, nom)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date_reception', { ascending: false });

    if (filter?.supplier_id) {
      query = query.eq('supplier_id', filter.supplier_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing supplier delivery notes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error in listSupplierDeliveryNotes:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get a supplier delivery note by ID
 */
export async function getSupplierDeliveryNote(
  id: string
): Promise<{ success: true; data: SupplierDeliveryNoteWithRelations } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_delivery_notes')
      .select(`
        *,
        supplier:clients!supplier_delivery_notes_supplier_id_fkey(id, nom, email),
        supplier_quote:supplier_quotes(id, reference),
        purchase_order:purchase_orders(id, numero)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return { success: false, error: 'BL fournisseur introuvable' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in getSupplierDeliveryNote:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update a supplier delivery note
 */
export async function updateSupplierDeliveryNote(
  id: string,
  payload: UpdateSupplierDeliveryNotePayload
): Promise<{ success: true; data: SupplierDeliveryNote } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const updateData: Record<string, unknown> = {};
    if (payload.supplier_id !== undefined) updateData.supplier_id = payload.supplier_id;
    if (payload.supplier_quote_id !== undefined) updateData.supplier_quote_id = payload.supplier_quote_id;
    if (payload.purchase_order_id !== undefined) updateData.purchase_order_id = payload.purchase_order_id;
    if (payload.reference !== undefined) updateData.reference = payload.reference;
    if (payload.date_reception !== undefined) updateData.date_reception = payload.date_reception;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.document_url !== undefined) updateData.document_url = payload.document_url;

    const { data, error } = await supabase
      .from('supplier_delivery_notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating supplier delivery note:', error);
      return { success: false, error: error?.message || 'Erreur lors de la mise à jour' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in updateSupplierDeliveryNote:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Delete (soft) a supplier delivery note
 */
export async function deleteSupplierDeliveryNote(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('supplier_delivery_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting supplier delivery note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteSupplierDeliveryNote:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}
