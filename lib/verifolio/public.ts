import { SupabaseClient } from '@supabase/supabase-js';
import type {
  VerifolioPublicProfile,
  VerifolioPublicActivity,
  VerifolioPublicReview,
  VerifolioCTA,
  VerifolioActivityMedia,
} from './types';
import { getProfileBySlug } from './profile';
import { listVisibleActivities } from './activities';
import { getPublicReviews } from './reviews';
import { DEFAULT_VERIFOLIO_THEME, type VerifolioThemeColor } from './themes';

type Supabase = SupabaseClient;

/**
 * Get CTAs for a profile
 */
async function getProfileCTAs(supabase: Supabase, profileId: string): Promise<VerifolioCTA[]> {
  const { data, error } = await supabase
    .from('verifolio_ctas')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getProfileCTAs error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get medias for an activity
 */
async function getActivityMedias(supabase: Supabase, activityId: string): Promise<VerifolioActivityMedia[]> {
  const { data, error } = await supabase
    .from('verifolio_activity_medias')
    .select('*')
    .eq('activity_id', activityId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getActivityMedias error:', error);
    return [];
  }

  return data || [];
}

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

  // Get CTAs
  const ctas = await getProfileCTAs(supabase, profile.id);

  // Get company logo URL if show_company_logo is enabled
  let companyLogoUrl: string | null = null;
  if ((profile as any).show_company_logo !== false) {
    const { data: company } = await supabase
      .from('companies')
      .select('logo_url')
      .eq('user_id', profile.user_id)
      .single();
    companyLogoUrl = company?.logo_url || null;
  }

  // Get activities if enabled
  let activities: VerifolioPublicActivity[] = [];
  if (profile.show_activities) {
    const rawActivities = await listVisibleActivities(supabase, profile.id);

    // Get medias for each activity
    activities = await Promise.all(
      rawActivities.map(async (a) => {
        const medias = await getActivityMedias(supabase, a.id);
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          image_url: a.image_url,
          details_text: (a as any).details_text || null,
          details_enabled: (a as any).details_enabled || false,
          medias,
        };
      })
    );
  }

  // Get reviews if enabled (now including company logo)
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
    ctas,
    cta1_label: profile.cta1_label,
    cta1_url: profile.cta1_url,
    cta2_label: profile.cta2_label,
    cta2_url: profile.cta2_url,
    show_activities: profile.show_activities,
    show_reviews: profile.show_reviews,
    theme_color: ((profile as any).theme_color || DEFAULT_VERIFOLIO_THEME) as VerifolioThemeColor,
    show_company_logo: (profile as any).show_company_logo !== false,
    company_logo_url: companyLogoUrl,
    activities,
    reviews,
  };
}
