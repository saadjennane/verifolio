import { SupabaseClient } from '@supabase/supabase-js';
import type {
  VerifolioProfile,
  CreateVerifolioProfileInput,
  UpdateVerifolioProfileInput,
} from './types';

type Supabase = SupabaseClient;

// ============================================================================
// Profile CRUD
// ============================================================================

/**
 * Get user's Verifolio profile
 */
export async function getProfile(
  supabase: Supabase,
  userId: string
): Promise<VerifolioProfile | null> {
  const { data, error } = await supabase
    .from('verifolio_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getProfile error:', error);
    return null;
  }

  return data;
}

/**
 * Get profile by slug (for public view)
 */
export async function getProfileBySlug(
  supabase: Supabase,
  slug: string
): Promise<VerifolioProfile | null> {
  const { data, error } = await supabase
    .from('verifolio_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getProfileBySlug error:', error);
    return null;
  }

  return data;
}

/**
 * Create a new Verifolio profile
 */
export async function createProfile(
  supabase: Supabase,
  userId: string,
  input: CreateVerifolioProfileInput
): Promise<{ success: boolean; data?: VerifolioProfile; error?: string }> {
  // Check if profile already exists
  const existing = await getProfile(supabase, userId);
  if (existing) {
    return { success: false, error: 'Profile already exists' };
  }

  // Generate slug if not provided
  let slug = input.slug;
  if (!slug) {
    const { data: slugData } = await supabase.rpc('generate_verifolio_slug', {
      base_name: input.display_name,
    });
    slug = slugData || `user-${Date.now()}`;
  }

  const { data, error } = await supabase
    .from('verifolio_profiles')
    .insert({
      user_id: userId,
      slug,
      display_name: input.display_name,
      title: input.title || null,
      bio: input.bio || null,
      photo_url: input.photo_url || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ce slug est déjà utilisé' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update Verifolio profile
 */
export async function updateProfile(
  supabase: Supabase,
  userId: string,
  input: UpdateVerifolioProfileInput
): Promise<{ success: boolean; data?: VerifolioProfile; error?: string }> {
  // Check slug uniqueness if changing
  if (input.slug) {
    const { data: existing } = await supabase
      .from('verifolio_profiles')
      .select('id')
      .eq('slug', input.slug)
      .neq('user_id', userId)
      .single();

    if (existing) {
      return { success: false, error: 'Ce slug est déjà utilisé' };
    }
  }

  const { data, error } = await supabase
    .from('verifolio_profiles')
    .update(input)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(
  supabase: Supabase,
  slug: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from('verifolio_profiles')
    .select('id')
    .eq('slug', slug);

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { data } = await query.single();
  return !data;
}

/**
 * Toggle profile publication status
 */
export async function togglePublished(
  supabase: Supabase,
  userId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('verifolio_profiles')
    .update({ is_published: isPublished })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
