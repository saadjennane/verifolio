import { createClient } from '@/lib/supabase/server';
import type { ActivityLog, LogActivityPayload } from './types';

/**
 * Log an activity (called from service layer functions)
 */
export async function logActivity(
  payload: LogActivityPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      entity_title: payload.entity_title,
      source: payload.source || 'manual',
      changes: payload.changes || null,
    });

    if (error) {
      console.error('logActivity error:', error);
      return { success: false, error: 'Erreur lors du log' };
    }

    return { success: true };
  } catch (error) {
    console.error('logActivity error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List activity logs with pagination
 */
export async function listActivityLogs(
  limit = 50,
  offset = 0
): Promise<{ success: boolean; data?: ActivityLog[]; total?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get total count
    const { count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get paginated data
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ActivityLog[], total: count || 0 };
  } catch (error) {
    console.error('listActivityLogs error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
