-- ============================================================================
-- Migration 054: Add title column to proposals table
-- ============================================================================

-- Add title column if it doesn't exist
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Set default title for existing proposals based on deal title
UPDATE proposals p
SET title = CONCAT('Proposition - ', COALESCE(d.title, 'Sans titre'))
FROM deals d
WHERE p.deal_id = d.id
  AND p.title IS NULL;

-- Set a default for any orphaned proposals
UPDATE proposals
SET title = 'Proposition'
WHERE title IS NULL;

-- Make title NOT NULL now that all rows have values
ALTER TABLE proposals
  ALTER COLUMN title SET NOT NULL;

-- Add default for future inserts
ALTER TABLE proposals
  ALTER COLUMN title SET DEFAULT 'Nouvelle proposition';

COMMENT ON COLUMN proposals.title IS 'Titre de la proposition';
