import { createClient } from '@/lib/supabase/server';
import type { NavigationTab, UserNavigationPreference } from './types';

/**
 * Récupère les préférences de navigation de l'utilisateur
 */
export async function getUserNavigationPreferences(): Promise<{
  success: boolean;
  data?: NavigationTab[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier si l'utilisateur a déjà des préférences
    const { data: existingPrefs, error: checkError } = await supabase
      .from('user_navigation_preferences')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (checkError) {
      console.error('Error checking navigation preferences:', checkError);
    }

    // Si pas de préférences, les initialiser
    if (!existingPrefs || existingPrefs.length === 0) {
      const { error: initError } = await supabase.rpc(
        'initialize_user_navigation_preferences',
        {
          p_user_id: user.id,
        }
      );

      if (initError) {
        console.error('Error initializing navigation preferences:', initError);
      }
    }

    // Récupérer les préférences via la vue
    const { data, error } = await supabase
      .from('user_navigation_view')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching navigation preferences:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des préférences',
      };
    }

    return { success: true, data: data as NavigationTab[] };
  } catch (error) {
    console.error('getUserNavigationPreferences error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Réordonne les tabs de navigation
 */
export async function reorderNavigationTabs(tabOrders: Array<{ tab_key: string; order: number }>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase.rpc('reorder_navigation_tabs', {
      p_user_id: user.id,
      p_tab_orders: tabOrders,
    });

    if (error) {
      console.error('Error reordering navigation tabs:', error);
      return { success: false, error: 'Erreur lors du réordonnancement' };
    }

    return { success: true };
  } catch (error) {
    console.error('reorderNavigationTabs error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Active/désactive la visibilité d'un tab
 */
export async function toggleTabVisibility(
  tabKey: string,
  isVisible: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase.rpc('toggle_navigation_tab_visibility', {
      p_user_id: user.id,
      p_tab_key: tabKey,
      p_is_visible: isVisible,
    });

    if (error) {
      console.error('Error toggling tab visibility:', error);
      return { success: false, error: 'Erreur lors de la modification' };
    }

    return { success: true };
  } catch (error) {
    console.error('toggleTabVisibility error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
