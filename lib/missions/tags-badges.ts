import { createClient } from '@/lib/supabase/server';
import type { MissionTag, MissionBadge } from './types';

/**
 * Ajouter un tag à une mission
 */
export async function addMissionTag(
  missionId: string,
  tag: string,
  color: string = 'gray'
): Promise<{ success: true; data: MissionTag } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    const { data: missionTag, error } = await supabase
      .from('mission_tags')
      .insert({
        mission_id: missionId,
        tag,
        color,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ce tag existe déjà sur cette mission' };
      }
      return { success: false, error: 'Erreur lors de l\'ajout du tag' };
    }

    return { success: true, data: missionTag };
  } catch (error) {
    console.error('addMissionTag error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Retirer un tag d'une mission
 */
export async function removeMissionTag(
  missionId: string,
  tag: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    const { error } = await supabase
      .from('mission_tags')
      .delete()
      .eq('mission_id', missionId)
      .eq('tag', tag);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression du tag' };
    }

    return { success: true };
  } catch (error) {
    console.error('removeMissionTag error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Ajouter un badge à une mission
 */
export async function addMissionBadge(
  missionId: string,
  badge: string,
  variant: string = 'gray'
): Promise<{ success: true; data: MissionBadge } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    const { data: missionBadge, error } = await supabase
      .from('mission_badges')
      .insert({
        mission_id: missionId,
        badge,
        variant,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ce badge existe déjà sur cette mission' };
      }
      return { success: false, error: 'Erreur lors de l\'ajout du badge' };
    }

    return { success: true, data: missionBadge };
  } catch (error) {
    console.error('addMissionBadge error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Retirer un badge d'une mission
 */
export async function removeMissionBadge(
  missionId: string,
  badge: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    const { error } = await supabase
      .from('mission_badges')
      .delete()
      .eq('mission_id', missionId)
      .eq('badge', badge);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression du badge' };
    }

    return { success: true };
  } catch (error) {
    console.error('removeMissionBadge error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
