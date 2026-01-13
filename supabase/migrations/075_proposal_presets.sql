-- ============================================================================
-- Migration 075: Add proposal presets and visual options
-- Allows selecting different layouts and visual customizations for proposals
-- ============================================================================

-- Add preset and visual options to proposal_templates
ALTER TABLE proposal_templates
  ADD COLUMN IF NOT EXISTS preset_id TEXT NOT NULL DEFAULT 'classic'
    CHECK (preset_id IN ('classic', 'modern', 'minimal', 'elegant', 'professional', 'creative')),
  ADD COLUMN IF NOT EXISTS show_logo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS show_table_of_contents BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_section_numbers BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_page_numbers BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS footer_text TEXT;

-- Add preset override to individual proposals
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS preset_id TEXT
    CHECK (preset_id IS NULL OR preset_id IN ('classic', 'modern', 'minimal', 'elegant', 'professional', 'creative')),
  ADD COLUMN IF NOT EXISTS visual_options_override JSONB;

-- Comments for documentation
COMMENT ON COLUMN proposal_templates.preset_id IS 'Selected layout preset (classic, modern, minimal, elegant, professional, creative)';
COMMENT ON COLUMN proposal_templates.show_logo IS 'Display company logo in header';
COMMENT ON COLUMN proposal_templates.cover_image_url IS 'Optional cover image URL';
COMMENT ON COLUMN proposal_templates.show_table_of_contents IS 'Auto-generate table of contents';
COMMENT ON COLUMN proposal_templates.show_section_numbers IS 'Number sections (1. 2. 3.)';
COMMENT ON COLUMN proposal_templates.show_page_numbers IS 'Display page numbers in footer';
COMMENT ON COLUMN proposal_templates.footer_text IS 'Custom footer text';

COMMENT ON COLUMN proposals.preset_id IS 'Override preset for this specific proposal';
COMMENT ON COLUMN proposals.visual_options_override IS 'JSON override for visual options';
