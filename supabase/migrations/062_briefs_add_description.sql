-- ============================================================================
-- Migration 062: Add description field to briefs
-- ============================================================================
-- Adds an optional description field to briefs for additional context

ALTER TABLE briefs ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN briefs.description IS 'Optional description providing additional context for the brief';
