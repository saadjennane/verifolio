// ============================================================================
// Verifolio Public Profile Types
// ============================================================================

import type { VerifolioThemeColor } from './themes';

// ----------------------------------------------------------------------------
// Verifolio CTA (Call to Action)
// ----------------------------------------------------------------------------

export type VerifolioCTAIcon =
  | 'email'
  | 'portfolio'
  | 'instagram'
  | 'linkedin'
  | 'website'
  | 'calendar'
  | 'phone'
  | 'download'
  | 'twitter'
  | 'youtube'
  | 'tiktok'
  | 'github';

export interface VerifolioCTA {
  id: string;
  profile_id: string;
  label: string;
  url: string;
  icon: VerifolioCTAIcon | null;
  variant: 'primary' | 'secondary';
  sort_order: number;
  created_at?: string;
}

export interface CreateVerifolioCTAInput {
  label: string;
  url: string;
  icon?: VerifolioCTAIcon | null;
  variant?: 'primary' | 'secondary';
  sort_order?: number;
}

export interface UpdateVerifolioCTAInput {
  label?: string;
  url?: string;
  icon?: VerifolioCTAIcon | null;
  variant?: 'primary' | 'secondary';
  sort_order?: number;
}

// ----------------------------------------------------------------------------
// Verifolio Activity Media
// ----------------------------------------------------------------------------

export interface VerifolioActivityMedia {
  id: string;
  activity_id: string;
  media_type: 'image' | 'video';
  url: string;
  caption: string | null;
  sort_order: number;
  created_at?: string;
}

export interface CreateVerifolioActivityMediaInput {
  media_type: 'image' | 'video';
  url: string;
  caption?: string | null;
  sort_order?: number;
}

export interface UpdateVerifolioActivityMediaInput {
  media_type?: 'image' | 'video';
  url?: string;
  caption?: string | null;
  sort_order?: number;
}

// ----------------------------------------------------------------------------
// Verifolio Profile
// ----------------------------------------------------------------------------

export interface VerifolioProfile {
  id: string;
  user_id: string;
  slug: string;
  is_published: boolean;

  // Header
  photo_url: string | null;
  display_name: string;
  title: string | null;
  bio: string | null;

  // CTAs
  cta1_label: string | null;
  cta1_url: string | null;
  cta2_label: string | null;
  cta2_url: string | null;

  // Sections
  show_activities: boolean;
  show_reviews: boolean;

  // Filters
  reviews_min_rating: number | null;

  // Theme customization
  theme_color: VerifolioThemeColor;
  show_company_logo: boolean;

  created_at: string;
  updated_at: string;
}

export interface CreateVerifolioProfileInput {
  display_name: string;
  slug?: string; // Will be auto-generated if not provided
  title?: string;
  bio?: string;
  photo_url?: string;
}

export interface UpdateVerifolioProfileInput {
  slug?: string;
  is_published?: boolean;
  photo_url?: string | null;
  display_name?: string;
  title?: string | null;
  bio?: string | null;
  cta1_label?: string | null;
  cta1_url?: string | null;
  cta2_label?: string | null;
  cta2_url?: string | null;
  show_activities?: boolean;
  show_reviews?: boolean;
  reviews_min_rating?: number | null;
  theme_color?: VerifolioThemeColor;
  show_company_logo?: boolean;
}

// ----------------------------------------------------------------------------
// Verifolio Activity
// ----------------------------------------------------------------------------

export interface VerifolioActivity {
  id: string;
  user_id: string;
  profile_id: string;
  user_activity_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  // Detail modal fields
  details_text: string | null;
  details_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVerifolioActivityInput {
  title: string;
  description?: string;
  image_url?: string;
  user_activity_id?: string;
  sort_order?: number;
}

export interface UpdateVerifolioActivityInput {
  title?: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  details_text?: string | null;
  details_enabled?: boolean;
}

// ----------------------------------------------------------------------------
// Verifolio Review Selection
// ----------------------------------------------------------------------------

export interface VerifolioReviewSelection {
  id: string;
  profile_id: string;
  review_id: string;
  activity_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface CreateReviewSelectionInput {
  review_id: string;
  activity_id?: string;
  sort_order?: number;
}

// ----------------------------------------------------------------------------
// Public View Types (for the public page)
// ----------------------------------------------------------------------------

export interface VerifolioPublicReview {
  id: string;
  reviewer_name: string | null;
  reviewer_company: string | null;
  reviewer_company_logo_url: string | null;
  reviewer_role: string | null;
  rating_overall: number | null;
  comment: string;
  consent_display_identity: boolean;
  is_professional_email: boolean | null;
  created_at: string;
  // Linked activity (if any)
  activity_id: string | null;
  activity_title: string | null;
}

export interface VerifolioPublicActivity {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  // Detail modal fields
  details_text: string | null;
  details_enabled: boolean;
  medias: VerifolioActivityMedia[];
}

export interface VerifolioPublicProfile {
  slug: string;

  // Header
  photo_url: string | null;
  display_name: string;
  title: string | null;
  bio: string | null;

  // CTAs (flexible, up to 8)
  ctas: VerifolioCTA[];

  // Legacy CTAs (deprecated, kept for backwards compatibility)
  cta1_label: string | null;
  cta1_url: string | null;
  cta2_label: string | null;
  cta2_url: string | null;

  // Sections
  show_activities: boolean;
  show_reviews: boolean;

  // Theme customization
  theme_color: VerifolioThemeColor;
  show_company_logo: boolean;
  company_logo_url: string | null; // From user's company settings

  // Data
  activities: VerifolioPublicActivity[];
  reviews: VerifolioPublicReview[];
}
