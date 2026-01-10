-- ============================================================================
-- Migration 055: Make template_id nullable in proposals
-- Allows creating proposals without a template (blank page)
-- ============================================================================

-- Remove NOT NULL constraint from template_id if it exists
ALTER TABLE proposals
  ALTER COLUMN template_id DROP NOT NULL;

-- Update any existing constraint to allow null
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_template_id_fkey;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES proposal_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN proposals.template_id IS 'Template utilisé (NULL pour page blanche)';
