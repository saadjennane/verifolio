-- ============================================================================
-- Migration 080: Review Soft Verification
-- Add email type detection and publication notification tracking
-- ============================================================================

-- Add column for email type detection (professional vs generic)
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_professional_email BOOLEAN;

-- Add column for tracking publication notification sent
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS publication_notified_at TIMESTAMPTZ;

-- Backfill existing reviews: detect email type based on domain
-- Generic domains: gmail, yahoo, outlook, hotmail, etc.
UPDATE reviews
SET is_professional_email = NOT (
  reviewer_email ILIKE '%@gmail.com' OR
  reviewer_email ILIKE '%@googlemail.com' OR
  reviewer_email ILIKE '%@yahoo.com' OR
  reviewer_email ILIKE '%@yahoo.fr' OR
  reviewer_email ILIKE '%@ymail.com' OR
  reviewer_email ILIKE '%@outlook.com' OR
  reviewer_email ILIKE '%@hotmail.com' OR
  reviewer_email ILIKE '%@hotmail.fr' OR
  reviewer_email ILIKE '%@live.com' OR
  reviewer_email ILIKE '%@msn.com' OR
  reviewer_email ILIKE '%@icloud.com' OR
  reviewer_email ILIKE '%@me.com' OR
  reviewer_email ILIKE '%@mac.com' OR
  reviewer_email ILIKE '%@protonmail.com' OR
  reviewer_email ILIKE '%@proton.me' OR
  reviewer_email ILIKE '%@aol.com' OR
  reviewer_email ILIKE '%@free.fr' OR
  reviewer_email ILIKE '%@orange.fr' OR
  reviewer_email ILIKE '%@sfr.fr' OR
  reviewer_email ILIKE '%@laposte.net' OR
  reviewer_email ILIKE '%@gmx.com' OR
  reviewer_email ILIKE '%@gmx.fr' OR
  reviewer_email ILIKE '%@mail.com' OR
  reviewer_email ILIKE '%@zoho.com'
)
WHERE is_professional_email IS NULL AND reviewer_email IS NOT NULL;
