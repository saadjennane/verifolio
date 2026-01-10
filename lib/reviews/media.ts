import { createClient } from '@/lib/supabase/server';
import type { ReviewMissionMedia, AddMissionMediaPayload } from './types';

/**
 * Ajoute un média (image/vidéo) au contexte d'une mission (invoice)
 */
export async function addMissionMedia(
  invoiceId: string,
  payload: AddMissionMediaPayload
): Promise<{ success: boolean; data?: ReviewMissionMedia; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que la facture existe et appartient à l'utilisateur
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: 'Facture introuvable' };
  }

  // Créer le média
  const { data: media, error: mediaError } = await supabase
    .from('review_mission_media')
    .insert({
      user_id: user.id,
      invoice_id: invoiceId,
      media_type: payload.media_type,
      media_url: payload.media_url,
      sort_order: payload.sort_order ?? 0,
      is_public: payload.is_public ?? true,
    })
    .select()
    .single();

  if (mediaError || !media) {
    return { success: false, error: 'Erreur lors de l\'ajout du média' };
  }

  return { success: true, data: media as ReviewMissionMedia };
}

/**
 * Liste les médias d'une mission (invoice)
 */
export async function listMissionMedia(invoiceId: string): Promise<{
  success: boolean;
  data?: ReviewMissionMedia[];
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('review_mission_media')
    .select('*')
    .eq('user_id', user.id)
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as ReviewMissionMedia[] };
}

/**
 * Toggle la visibilité publique d'un média
 */
export async function toggleMissionMediaPublic(
  mediaId: string,
  isPublic: boolean
): Promise<{ success: boolean; data?: ReviewMissionMedia; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('review_mission_media')
    .update({ is_public: isPublic })
    .eq('id', mediaId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  return { success: true, data: data as ReviewMissionMedia };
}

/**
 * Supprime un média
 */
export async function deleteMissionMedia(mediaId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { error } = await supabase
    .from('review_mission_media')
    .delete()
    .eq('id', mediaId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erreur lors de la suppression' };
  }

  return { success: true };
}

/**
 * Réordonne les médias d'une facture
 */
export async function reorderMissionMedia(
  invoiceId: string,
  orderedMediaIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Mettre à jour l'ordre de chaque média
  const updates = orderedMediaIds.map((mediaId, index) =>
    supabase
      .from('review_mission_media')
      .update({ sort_order: index })
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .eq('invoice_id', invoiceId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    return { success: false, error: 'Erreur lors du réordonnancement' };
  }

  return { success: true };
}

/**
 * Liste les médias publics d'une facture (pour page publique)
 */
export async function listPublicMissionMedia(invoiceId: string): Promise<{
  success: boolean;
  data?: ReviewMissionMedia[];
  error?: string;
}> {
  const supabase = await createClient();

  // Pas besoin d'auth pour les médias publics
  const { data, error } = await supabase
    .from('review_mission_media')
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('is_public', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as ReviewMissionMedia[] };
}
