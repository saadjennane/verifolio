import { SupabaseClient } from '@supabase/supabase-js';
import type { VerifolioPublicProfile, VerifolioPublicActivity, VerifolioPublicReview } from './types';
import { getProfileBySlug } from './profile';
import { listVisibleActivities } from './activities';
import { getPublicReviews } from './reviews';

type Supabase = SupabaseClient;

/**
 * Get the complete public view of a Verifolio profile
 * Returns null if profile doesn't exist or is not published
 */
export async function getPublicProfile(
  supabase: Supabase,
  slug: string
): Promise<VerifolioPublicProfile | null> {
  // Get the profile
  const profile = await getProfileBySlug(supabase, slug);
  if (!profile) {
    return null;
  }

  // Get activities if enabled
  let activities: VerifolioPublicActivity[] = [];
  if (profile.show_activities) {
    const rawActivities = await listVisibleActivities(supabase, profile.id);
    activities = rawActivities.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      image_url: a.image_url,
    }));
  }

  // Get reviews if enabled
  let reviews: VerifolioPublicReview[] = [];
  if (profile.show_reviews) {
    reviews = await getPublicReviews(
      supabase,
      profile.id,
      profile.reviews_min_rating
    );
  }

  return {
    slug: profile.slug,
    photo_url: profile.photo_url,
    display_name: profile.display_name,
    title: profile.title,
    bio: profile.bio,
    cta1_label: profile.cta1_label,
    cta1_url: profile.cta1_url,
    cta2_label: profile.cta2_label,
    cta2_url: profile.cta2_url,
    show_activities: profile.show_activities,
    show_reviews: profile.show_reviews,
    activities,
    reviews,
  };
}
