import { SupabaseClient } from '@supabase/supabase-js';
import type {
  VerifolioReviewSelection,
  CreateReviewSelectionInput,
  VerifolioPublicReview,
} from './types';

type Supabase = SupabaseClient;

// ============================================================================
// Review Selections CRUD
// ============================================================================

/**
 * List review selections for a profile
 */
export async function listReviewSelections(
  supabase: Supabase,
  profileId: string
): Promise<VerifolioReviewSelection[]> {
  const { data, error } = await supabase
    .from('verifolio_review_selections')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('listReviewSelections error:', error);
    return [];
  }

  return data || [];
}

/**
 * Add a review to the selection
 */
export async function addReviewSelection(
  supabase: Supabase,
  profileId: string,
  input: CreateReviewSelectionInput
): Promise<{ success: boolean; data?: VerifolioReviewSelection; error?: string }> {
  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from('verifolio_review_selections')
    .select('sort_order')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = input.sort_order ?? ((maxOrder?.sort_order ?? -1) + 1);

  const { data, error } = await supabase
    .from('verifolio_review_selections')
    .insert({
      profile_id: profileId,
      review_id: input.review_id,
      activity_id: input.activity_id || null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Cet avis est déjà sélectionné' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Remove a review from the selection
 */
export async function removeReviewSelection(
  supabase: Supabase,
  selectionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('verifolio_review_selections')
    .delete()
    .eq('id', selectionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update review selection (activity link or order)
 */
export async function updateReviewSelection(
  supabase: Supabase,
  selectionId: string,
  input: { activity_id?: string | null; sort_order?: number }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('verifolio_review_selections')
    .update(input)
    .eq('id', selectionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder review selections
 */
export async function reorderReviewSelections(
  supabase: Supabase,
  profileId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('verifolio_review_selections')
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

// ============================================================================
// Public View Helpers
// ============================================================================

/**
 * Get reviews for public display with filtering
 */
export async function getPublicReviews(
  supabase: Supabase,
  profileId: string,
  minRating?: number | null,
  activityId?: string | null
): Promise<VerifolioPublicReview[]> {
  // First get the selections
  let selectionsQuery = supabase
    .from('verifolio_review_selections')
    .select(`
      id,
      activity_id,
      sort_order,
      review:reviews!inner(
        id,
        reviewer_name,
        reviewer_company,
        reviewer_role,
        rating_overall,
        comment,
        consent_display_identity,
        created_at,
        is_published
      ),
      activity:verifolio_activities(
        id,
        title
      )
    `)
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true });

  if (activityId) {
    selectionsQuery = selectionsQuery.eq('activity_id', activityId);
  }

  const { data: selections, error } = await selectionsQuery;

  if (error) {
    console.error('getPublicReviews error:', error);
    return [];
  }

  if (!selections) return [];

  // Filter and map the results
  const reviews: VerifolioPublicReview[] = [];

  for (const selection of selections) {
    const review = selection.review as any;

    // Skip unpublished reviews
    if (!review?.is_published) continue;

    // Apply min rating filter
    if (minRating && review.rating_overall && review.rating_overall < minRating) {
      continue;
    }

    const activity = selection.activity as any;

    reviews.push({
      id: review.id,
      reviewer_name: review.consent_display_identity ? review.reviewer_name : null,
      reviewer_company: review.consent_display_identity ? review.reviewer_company : null,
      reviewer_role: review.consent_display_identity ? review.reviewer_role : null,
      rating_overall: review.rating_overall,
      comment: review.comment,
      consent_display_identity: review.consent_display_identity,
      created_at: review.created_at,
      activity_id: selection.activity_id,
      activity_title: activity?.title || null,
    });
  }

  return reviews;
}

/**
 * Get all published reviews for user (for selection UI)
 */
export async function getAvailableReviews(
  supabase: Supabase,
  userId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      reviewer_name,
      reviewer_company,
      reviewer_role,
      rating_overall,
      comment,
      consent_display_identity,
      is_published,
      created_at,
      client:clients!client_id(
        id,
        nom
      )
    `)
    .eq('user_id', userId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAvailableReviews error:', error);
    return [];
  }

  return data || [];
}
