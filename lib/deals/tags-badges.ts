import { createClient } from '@/lib/supabase/server';
import type { DealTag, DealBadge } from './types';

/**
 * Ajoute un tag à un deal
 */
export async function addDealTag(
  dealId: string,
  tag: string,
  color: string = 'gray'
): Promise<{ success: boolean; data?: DealTag; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que le deal appartient à l'utilisateur
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (dealError || !deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  const { data, error } = await supabase
    .from('deal_tags')
    .insert({ deal_id: dealId, tag, color })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ce tag existe déjà pour ce deal' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: data as DealTag };
}

/**
 * Retire un tag d'un deal
 */
export async function removeDealTag(
  dealId: string,
  tag: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { error } = await supabase
    .from('deal_tags')
    .delete()
    .eq('deal_id', dealId)
    .eq('tag', tag);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Ajoute un badge à un deal
 */
export async function addDealBadge(
  dealId: string,
  badge: string,
  variant: string = 'default'
): Promise<{ success: boolean; data?: DealBadge; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que le deal appartient à l'utilisateur
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (dealError || !deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  const { data, error } = await supabase
    .from('deal_badges')
    .insert({ deal_id: dealId, badge, variant })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ce badge existe déjà pour ce deal' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: data as DealBadge };
}

/**
 * Retire un badge d'un deal
 */
export async function removeDealBadge(
  dealId: string,
  badge: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { error } = await supabase
    .from('deal_badges')
    .delete()
    .eq('deal_id', dealId)
    .eq('badge', badge);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
