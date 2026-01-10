import { SupabaseClient } from '@supabase/supabase-js';
import type { Company, CompanyPatch } from '@/lib/types/settings';

type Supabase = SupabaseClient;

// ============================================================================
// Company Helpers
// ============================================================================

/**
 * Get company for a user (or null if not exists)
 */
export async function getCompany(
  supabase: Supabase,
  userId: string
): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getCompany error:', error);
    return null;
  }

  return data;
}

/**
 * Create or update company for a user
 */
export async function upsertCompany(
  supabase: Supabase,
  userId: string,
  patch: CompanyPatch
): Promise<{ success: boolean; data?: Company; error?: string }> {
  // Check if company exists
  const existing = await getCompany(supabase, userId);

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('companies')
      .update(patch)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } else {
    // Insert - display_name is required
    if (!patch.display_name) {
      return { success: false, error: 'display_name is required for new company' };
    }

    const { data, error } = await supabase
      .from('companies')
      .insert({
        user_id: userId,
        display_name: patch.display_name,
        ...patch,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  }
}
