-- ============================================================================
-- Migration 079: Verifolio Themes
-- Add theme customization to verifolio_profiles
-- ============================================================================

-- Add theme color column (default: blue)
ALTER TABLE verifolio_profiles
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'blue';

-- Add show company logo toggle (default: true)
ALTER TABLE verifolio_profiles
ADD COLUMN IF NOT EXISTS show_company_logo BOOLEAN DEFAULT true;

-- Constraint for valid theme colors
ALTER TABLE verifolio_profiles
ADD CONSTRAINT verifolio_profiles_theme_color_check
CHECK (theme_color IN ('blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'gray'));
