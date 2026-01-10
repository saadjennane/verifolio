import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type {
  SupplierConsultation,
  SupplierConsultationWithQuotes,
  CreateConsultationPayload,
  UpdateConsultationPayload,
  ListConsultationsFilter,
} from './types';

/**
 * Create a new supplier consultation
 */
export async function createConsultation(
  payload: CreateConsultationPayload
): Promise<{ success: true; data: SupplierConsultation } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_consultations')
      .insert({
        user_id: user.id,
        title: payload.title,
        description: payload.description || null,
        status: 'open',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating consultation:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    await logActivity({
      action: 'create',
      entity_type: 'supplier_consultation',
      entity_id: data.id,
      entity_title: data.title,
    });

    return { success: true, data };
  } catch (error) {
    console.error('createConsultation error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List supplier consultations with optional filters
 */
export async function listConsultations(
  filter?: ListConsultationsFilter
): Promise<{ success: true; data: SupplierConsultationWithQuotes[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('supplier_consultations')
      .select(`
        *,
        quotes:supplier_quotes(
          id,
          supplier_id,
          reference,
          total_ttc,
          status,
          is_selected,
          supplier:clients(id, nom)
        )
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listConsultations error:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, data: data as SupplierConsultationWithQuotes[] };
  } catch (error) {
    console.error('listConsultations error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get a single consultation by ID with all quotes
 */
export async function getConsultation(
  id: string
): Promise<{ success: true; data: SupplierConsultationWithQuotes } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_consultations')
      .select(`
        *,
        quotes:supplier_quotes(
          *,
          supplier:clients(id, nom, email, vat_enabled)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return { success: false, error: 'Consultation introuvable' };
    }

    return { success: true, data: data as SupplierConsultationWithQuotes };
  } catch (error) {
    console.error('getConsultation error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update a consultation
 */
export async function updateConsultation(
  id: string,
  payload: UpdateConsultationPayload
): Promise<{ success: true; data: SupplierConsultation } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('supplier_consultations')
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
      entity_type: 'supplier_consultation',
      entity_id: data.id,
      entity_title: data.title,
    });

    return { success: true, data };
  } catch (error) {
    console.error('updateConsultation error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Soft delete a consultation
 */
export async function deleteConsultation(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get title for activity log
    const { data: consultation } = await supabase
      .from('supplier_consultations')
      .select('title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('supplier_consultations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    if (consultation) {
      await logActivity({
        action: 'delete',
        entity_type: 'supplier_consultation',
        entity_id: id,
        entity_title: consultation.title,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('deleteConsultation error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Select a winner quote for a consultation
 */
export async function selectConsultationWinner(
  consultationId: string,
  quoteId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Reset all quotes for this consultation
    await supabase
      .from('supplier_quotes')
      .update({ is_selected: false, status: 'rejected' })
      .eq('consultation_id', consultationId)
      .eq('user_id', user.id);

    // Mark the selected quote
    const { error } = await supabase
      .from('supplier_quotes')
      .update({ is_selected: true, status: 'accepted' })
      .eq('id', quoteId)
      .eq('consultation_id', consultationId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: 'Erreur lors de la sélection' };
    }

    // Close the consultation
    await supabase
      .from('supplier_consultations')
      .update({ status: 'closed' })
      .eq('id', consultationId)
      .eq('user_id', user.id);

    return { success: true };
  } catch (error) {
    console.error('selectConsultationWinner error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
