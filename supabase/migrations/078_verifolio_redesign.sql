-- ============================================================================
-- Migration 078: Verifolio Redesign
-- Add flexible CTAs (up to 8), activity medias, and company logos for reviews
-- ============================================================================

-- 1. Create flexible CTAs table (replaces cta1/cta2 fields)
CREATE TABLE IF NOT EXISTS verifolio_ctas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES verifolio_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,              -- 'email', 'portfolio', 'instagram', 'linkedin', 'website', 'calendar', 'phone', 'download'
  variant TEXT DEFAULT 'secondary', -- 'primary' or 'secondary'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient profile lookup
CREATE INDEX IF NOT EXISTS idx_verifolio_ctas_profile_id ON verifolio_ctas(profile_id);

-- Constraint for valid variants
ALTER TABLE verifolio_ctas
ADD CONSTRAINT verifolio_ctas_variant_check
CHECK (variant IN ('primary', 'secondary'));

-- 2. Add company logo to reviews
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS reviewer_company_logo_url TEXT;

-- 3. Add detail fields to verifolio_activities (for detail modal)
ALTER TABLE verifolio_activities
ADD COLUMN IF NOT EXISTS details_text TEXT;           -- Long description / rich text

ALTER TABLE verifolio_activities
ADD COLUMN IF NOT EXISTS details_enabled BOOLEAN DEFAULT false; -- Show "Voir la prestation" link

-- 4. Create activity medias table (images, videos)
CREATE TABLE IF NOT EXISTS verifolio_activity_medias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES verifolio_activities(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,  -- 'image' or 'video'
  url TEXT NOT NULL,         -- Image URL or video embed URL (YouTube, Vimeo)
  caption TEXT,              -- Optional caption
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient activity lookup
CREATE INDEX IF NOT EXISTS idx_verifolio_activity_medias_activity_id ON verifolio_activity_medias(activity_id);

-- Constraint for valid media types
ALTER TABLE verifolio_activity_medias
ADD CONSTRAINT verifolio_activity_medias_type_check
CHECK (media_type IN ('image', 'video'));

-- 5. Migrate existing CTAs from verifolio_profiles to verifolio_ctas
-- This preserves existing CTA data
DO $$
BEGIN
  -- Migrate CTA1 if exists
  INSERT INTO verifolio_ctas (profile_id, label, url, variant, sort_order)
  SELECT id, cta1_label, cta1_url, 'primary', 0
  FROM verifolio_profiles
  WHERE cta1_label IS NOT NULL AND cta1_url IS NOT NULL;

  -- Migrate CTA2 if exists
  INSERT INTO verifolio_ctas (profile_id, label, url, variant, sort_order)
  SELECT id, cta2_label, cta2_url, 'secondary', 1
  FROM verifolio_profiles
  WHERE cta2_label IS NOT NULL AND cta2_url IS NOT NULL;
END $$;

-- Note: Old CTA columns (cta1_label, cta1_url, cta2_label, cta2_url) kept for backwards compatibility
-- Can be removed in a future migration after confirming data migration success

-- 6. Enable RLS on new tables
ALTER TABLE verifolio_ctas ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifolio_activity_medias ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for verifolio_ctas
-- Users can read their own CTAs
CREATE POLICY "Users can read own CTAs" ON verifolio_ctas
  FOR SELECT USING (
    profile_id IN (SELECT id FROM verifolio_profiles WHERE user_id = auth.uid())
  );

-- Public can read CTAs for published profiles
CREATE POLICY "Public can read CTAs for published profiles" ON verifolio_ctas
  FOR SELECT USING (
    profile_id IN (SELECT id FROM verifolio_profiles WHERE is_published = true)
  );

-- Users can insert their own CTAs
CREATE POLICY "Users can insert own CTAs" ON verifolio_ctas
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM verifolio_profiles WHERE user_id = auth.uid())
  );

-- Users can update their own CTAs
CREATE POLICY "Users can update own CTAs" ON verifolio_ctas
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM verifolio_profiles WHERE user_id = auth.uid())
  );

-- Users can delete their own CTAs
CREATE POLICY "Users can delete own CTAs" ON verifolio_ctas
  FOR DELETE USING (
    profile_id IN (SELECT id FROM verifolio_profiles WHERE user_id = auth.uid())
  );

-- 8. RLS policies for verifolio_activity_medias
-- Users can read their own activity medias
CREATE POLICY "Users can read own activity medias" ON verifolio_activity_medias
  FOR SELECT USING (
    activity_id IN (
      SELECT va.id FROM verifolio_activities va
      JOIN verifolio_profiles vp ON va.profile_id = vp.id
      WHERE vp.user_id = auth.uid()
    )
  );

-- Public can read medias for published profiles
CREATE POLICY "Public can read medias for published profiles" ON verifolio_activity_medias
  FOR SELECT USING (
    activity_id IN (
      SELECT va.id FROM verifolio_activities va
      JOIN verifolio_profiles vp ON va.profile_id = vp.id
      WHERE vp.is_published = true
    )
  );

-- Users can insert their own activity medias
CREATE POLICY "Users can insert own activity medias" ON verifolio_activity_medias
  FOR INSERT WITH CHECK (
    activity_id IN (
      SELECT va.id FROM verifolio_activities va
      JOIN verifolio_profiles vp ON va.profile_id = vp.id
      WHERE vp.user_id = auth.uid()
    )
  );

-- Users can update their own activity medias
CREATE POLICY "Users can update own activity medias" ON verifolio_activity_medias
  FOR UPDATE USING (
    activity_id IN (
      SELECT va.id FROM verifolio_activities va
      JOIN verifolio_profiles vp ON va.profile_id = vp.id
      WHERE vp.user_id = auth.uid()
    )
  );

-- Users can delete their own activity medias
CREATE POLICY "Users can delete own activity medias" ON verifolio_activity_medias
  FOR DELETE USING (
    activity_id IN (
      SELECT va.id FROM verifolio_activities va
      JOIN verifolio_profiles vp ON va.profile_id = vp.id
      WHERE vp.user_id = auth.uid()
    )
  );
