-- ============================================================================
-- Migration 074: Add template preset ID to companies
-- Allows selecting different document layouts (classic, modern, minimal, etc.)
-- ============================================================================

-- Add template_preset_id column to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS template_preset_id TEXT NOT NULL DEFAULT 'classic'
  CHECK (template_preset_id IN ('classic', 'modern', 'minimal', 'elegant', 'professional', 'creative'));

COMMENT ON COLUMN companies.template_preset_id IS 'Selected document template layout preset';
