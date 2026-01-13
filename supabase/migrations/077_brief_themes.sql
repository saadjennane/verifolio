-- ============================================================================
-- Migration 077: Brief Themes
-- Add theme customization (color + logo) to briefs and brief templates
-- ============================================================================

-- Add theme_color to brief_templates (default: blue)
ALTER TABLE brief_templates
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'blue';

-- Add theme_color to briefs (inherited from template at creation)
ALTER TABLE briefs
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'blue';

-- Add show_logo option to brief_templates
ALTER TABLE brief_templates
ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT true;

-- Add show_logo option to briefs
ALTER TABLE briefs
ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT true;

-- Add show_brief_reminder to templates (shows deal context at top of form)
ALTER TABLE brief_templates
ADD COLUMN IF NOT EXISTS show_brief_reminder BOOLEAN DEFAULT true;

-- Add show_brief_reminder to briefs
ALTER TABLE briefs
ADD COLUMN IF NOT EXISTS show_brief_reminder BOOLEAN DEFAULT true;

-- Add brief_reminder_text to briefs (context from deal shown at top of form)
ALTER TABLE briefs
ADD COLUMN IF NOT EXISTS brief_reminder_text TEXT;

-- Add constraint to ensure valid theme colors
-- Valid colors: 12 colors (3 rows of 4)
ALTER TABLE brief_templates
ADD CONSTRAINT brief_templates_theme_color_check
CHECK (theme_color IN ('blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'gray'));

ALTER TABLE briefs
ADD CONSTRAINT briefs_theme_color_check
CHECK (theme_color IN ('blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'gray'));
