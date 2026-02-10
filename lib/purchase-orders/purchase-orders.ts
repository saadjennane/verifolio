import { createClient } from '@/lib/supabase/server';
import type {
  PurchaseOrder,
  PurchaseOrderWithRelations,
  PurchaseOrderListItem,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
} from './types';

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload
): Promise<{ success: true; data: PurchaseOrder } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Generate PO number
    const { data: numeroData, error: numeroError } = await supabase
      .rpc('generate_po_number', { p_user_id: user.id });

    if (numeroError) {
      console.error('Error generating PO number:', numeroError);
      return { success: false, error: 'Erreur génération numéro' };
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

    const { line_items, ...orderData } = payload;

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        user_id: user.id,
        supplier_id: orderData.supplier_id,
        supplier_quote_id: orderData.supplier_quote_id || null,
        numero: numeroData,
        date_emission: orderData.date_emission || new Date().toISOString().split('T')[0],
        date_livraison_prevue: orderData.date_livraison_prevue || null,
        total_ht: orderData.total_ht || null,
        total_tva: orderData.total_tva || null,
        total_ttc: orderData.total_ttc || null,
        vat_enabled: vatEnabled,
        notes: orderData.notes || null,
        status: 'brouillon',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating purchase order:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    // Create line items if provided
    if (line_items && line_items.length > 0) {
      const itemsToInsert = line_items.map((item, index) => ({
        purchase_order_id: data.id,
        description: item.description,
        quantite: item.quantite ?? 1,
        unite: item.unite ?? 'unité',
        prix_unitaire_ht: item.prix_unitaire_ht || null,
        taux_tva: item.taux_tva ?? 20,
        ordre: item.ordre ?? index,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_line_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating line items:', itemsError);
      }
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in createPurchaseOrder:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List purchase orders with optional filters
 */
export async function listPurchaseOrders(
  filter?: { supplier_id?: string; status?: string }
): Promise<{ success: true; data: PurchaseOrderListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:clients!purchase_orders_supplier_id_fkey(id, nom)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date_emission', { ascending: false });

    if (filter?.supplier_id) {
      query = query.eq('supplier_id', filter.supplier_id);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing purchase orders:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error in listPurchaseOrders:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get a purchase order by ID
 */
export async function getPurchaseOrder(
  id: string
): Promise<{ success: true; data: PurchaseOrderWithRelations } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:clients!purchase_orders_supplier_id_fkey(id, nom, email),
        supplier_quote:supplier_quotes(id, reference),
        line_items:purchase_order_line_items(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return { success: false, error: 'Bon de commande introuvable' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in getPurchaseOrder:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update a purchase order
 */
export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePurchaseOrderPayload
): Promise<{ success: true; data: PurchaseOrder } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const updateData: Record<string, unknown> = {};
    if (payload.supplier_id !== undefined) updateData.supplier_id = payload.supplier_id;
    if (payload.supplier_quote_id !== undefined) updateData.supplier_quote_id = payload.supplier_quote_id;
    if (payload.date_emission !== undefined) updateData.date_emission = payload.date_emission;
    if (payload.date_livraison_prevue !== undefined) updateData.date_livraison_prevue = payload.date_livraison_prevue;
    if (payload.total_ht !== undefined) updateData.total_ht = payload.total_ht;
    if (payload.total_tva !== undefined) updateData.total_tva = payload.total_tva;
    if (payload.total_ttc !== undefined) updateData.total_ttc = payload.total_ttc;
    if (payload.vat_enabled !== undefined) updateData.vat_enabled = payload.vat_enabled;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating purchase order:', error);
      return { success: false, error: error?.message || 'Erreur lors de la mise à jour' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in updatePurchaseOrder:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Delete (soft) a purchase order
 */
export async function deletePurchaseOrder(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('purchase_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting purchase order:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deletePurchaseOrder:', err);
    return { success: false, error: 'Erreur serveur' };
  }
}
