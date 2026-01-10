import { createClient } from '@/lib/supabase/server';

/**
 * Badges prédéfinis
 */
export const BADGE_DEFINITIONS = {
  URGENT: { code: 'urgent', label: 'URGENT', variant: 'red' },
  VIP: { code: 'vip', label: 'VIP', variant: 'yellow' },
  REVIEW: { code: 'review', label: 'REVIEW', variant: 'blue' },
} as const;

/**
 * Ajouter le badge URGENT à un deal (manuel)
 */
export async function addUrgentBadgeToDeal(dealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que le deal appartient à l'utilisateur
  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (!deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  const { error } = await supabase
    .from('deal_badges')
    .insert({
      deal_id: dealId,
      badge: BADGE_DEFINITIONS.URGENT.label,
      variant: BADGE_DEFINITIONS.URGENT.variant,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Badge URGENT déjà présent' };
    }
    return { success: false, error: 'Erreur lors de l\'ajout du badge' };
  }

  return { success: true };
}

/**
 * Ajouter le badge VIP à un deal (manuel)
 */
export async function addVipBadgeToDeal(dealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (!deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  const { error } = await supabase
    .from('deal_badges')
    .insert({
      deal_id: dealId,
      badge: BADGE_DEFINITIONS.VIP.label,
      variant: BADGE_DEFINITIONS.VIP.variant,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Badge VIP déjà présent' };
    }
    return { success: false, error: 'Erreur lors de l\'ajout du badge' };
  }

  return { success: true };
}

/**
 * Ajouter le badge REVIEW à un deal (automatique lors SENT → DRAFT)
 */
export async function addReviewBadgeToDeal(dealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (!deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  const { error } = await supabase
    .from('deal_badges')
    .insert({
      deal_id: dealId,
      badge: BADGE_DEFINITIONS.REVIEW.label,
      variant: BADGE_DEFINITIONS.REVIEW.variant,
    });

  if (error) {
    // Si le badge existe déjà, on ignore (pas une erreur)
    if (error.code === '23505') {
      return { success: true };
    }
    return { success: false, error: 'Erreur lors de l\'ajout du badge' };
  }

  return { success: true };
}

/**
 * Récupérer les tags utilisateur pour autocomplete
 */
export async function getUserTagLibrary(): Promise<{
  success: boolean;
  data?: Array<{ tag: string; color: string; usage_count: number }>;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('user_tag_library')
    .select('tag, color, usage_count')
    .eq('user_id', user.id)
    .order('usage_count', { ascending: false })
    .order('tag', { ascending: true });

  if (error) {
    console.error('getUserTagLibrary error:', error);
    return { success: false, error: 'Erreur lors de la récupération des tags' };
  }

  return { success: true, data: data || [] };
}
