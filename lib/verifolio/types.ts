// ============================================================================
// Verifolio Public Profile Types
// ============================================================================

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
  reviewer_role: string | null;
  rating_overall: number | null;
  comment: string;
  consent_display_identity: boolean;
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
}

export interface VerifolioPublicProfile {
  slug: string;

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

  // Data
  activities: VerifolioPublicActivity[];
  reviews: VerifolioPublicReview[];
}
