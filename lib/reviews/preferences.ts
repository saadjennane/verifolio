import { createClient } from '@/lib/supabase/server';
import type { ReviewDisplayPreferences, ShowRatingsMode } from './types';

/**
 * Récupère les préférences d'affichage de l'utilisateur
 * Crée les préférences par défaut si elles n'existent pas
 */
export async function getReviewDisplayPreferences(): Promise<{
  success: boolean;
  data?: ReviewDisplayPreferences;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Essayer de récupérer les préférences existantes
  const { data: prefs, error: fetchError } = await supabase
    .from('review_display_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  // Si pas de préférences, créer les valeurs par défaut
  if (!prefs) {
    const { data: newPrefs, error: createError } = await supabase
      .from('review_display_preferences')
      .insert({
        user_id: user.id,
        show_ratings_mode: 'all',
        show_comment: true,
      })
      .select()
      .single();

    if (createError || !newPrefs) {
      return { success: false, error: 'Erreur lors de la création des préférences' };
    }

    return { success: true, data: newPrefs as ReviewDisplayPreferences };
  }

  return { success: true, data: prefs as ReviewDisplayPreferences };
}

/**
 * Met à jour les préférences d'affichage
 */
export async function updateReviewDisplayPreferences(patch: {
  show_ratings_mode?: ShowRatingsMode;
  show_comment?: boolean;
}): Promise<{
  success: boolean;
  data?: ReviewDisplayPreferences;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // S'assurer que les préférences existent
  await getReviewDisplayPreferences();

  // Mettre à jour
  const { data, error } = await supabase
    .from('review_display_preferences')
    .update(patch)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  return { success: true, data: data as ReviewDisplayPreferences };
}

/**
 * Récupère les préférences d'affichage publiques d'un utilisateur (pour page publique)
 */
export async function getPublicDisplayPreferences(userId: string): Promise<{
  success: boolean;
  data?: ReviewDisplayPreferences;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('review_display_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  // Si pas de préférences, retourner les valeurs par défaut
  if (!data) {
    return {
      success: true,
      data: {
        user_id: userId,
        show_ratings_mode: 'all',
        show_comment: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  return { success: true, data: data as ReviewDisplayPreferences };
}
