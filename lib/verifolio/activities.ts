import { SupabaseClient } from '@supabase/supabase-js';
import type {
  VerifolioActivity,
  CreateVerifolioActivityInput,
  UpdateVerifolioActivityInput,
} from './types';

type Supabase = SupabaseClient;

// ============================================================================
// Activities CRUD
// ============================================================================

/**
 * List activities for a profile
 */
export async function listActivities(
  supabase: Supabase,
  profileId: string
): Promise<VerifolioActivity[]> {
  const { data, error } = await supabase
    .from('verifolio_activities')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('listActivities error:', error);
    return [];
  }

  return data || [];
}

/**
 * List visible activities for public view
 */
export async function listVisibleActivities(
  supabase: Supabase,
  profileId: string
): Promise<VerifolioActivity[]> {
  const { data, error } = await supabase
    .from('verifolio_activities')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('listVisibleActivities error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single activity
 */
export async function getActivity(
  supabase: Supabase,
  activityId: string
): Promise<VerifolioActivity | null> {
  const { data, error } = await supabase
    .from('verifolio_activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error) {
    console.error('getActivity error:', error);
    return null;
  }

  return data;
}

/**
 * Create a new activity
 */
export async function createActivity(
  supabase: Supabase,
  userId: string,
  profileId: string,
  input: CreateVerifolioActivityInput
): Promise<{ success: boolean; data?: VerifolioActivity; error?: string }> {
  // Get max sort_order for default positioning
  const { data: maxOrder } = await supabase
    .from('verifolio_activities')
    .select('sort_order')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = input.sort_order ?? ((maxOrder?.sort_order ?? -1) + 1);

  const { data, error } = await supabase
    .from('verifolio_activities')
    .insert({
      user_id: userId,
      profile_id: profileId,
      title: input.title,
      description: input.description || null,
      image_url: input.image_url || null,
      user_activity_id: input.user_activity_id || null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update an activity
 */
export async function updateActivity(
  supabase: Supabase,
  activityId: string,
  input: UpdateVerifolioActivityInput
): Promise<{ success: boolean; data?: VerifolioActivity; error?: string }> {
  const { data, error } = await supabase
    .from('verifolio_activities')
    .update(input)
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete an activity
 */
export async function deleteActivity(
  supabase: Supabase,
  activityId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('verifolio_activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder activities
 */
export async function reorderActivities(
  supabase: Supabase,
  profileId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // Update each activity's sort_order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('verifolio_activities')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('profile_id', profileId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    return { success: false, error: 'Erreur lors du réordonnancement' };
  }

  return { success: true };
}
