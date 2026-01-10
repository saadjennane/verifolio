-- ============================================================================
-- Migration 061: Add new question types to briefs
-- ============================================================================
-- Adds: media, time, rating types to brief questions

-- Drop existing constraints
ALTER TABLE brief_template_questions DROP CONSTRAINT IF EXISTS brief_template_questions_type_check;
ALTER TABLE brief_questions DROP CONSTRAINT IF EXISTS brief_questions_type_check;

-- Add new constraints with expanded types
ALTER TABLE brief_template_questions ADD CONSTRAINT brief_template_questions_type_check
  CHECK (type IN (
    -- Structure blocks (no response expected)
    'title',        -- Section title
    'description',  -- Explanatory text
    'separator',    -- Visual separator
    'media',        -- Image/Video/Link block
    -- Data collection blocks
    'text_short',   -- Short text input
    'text_long',    -- Multi-line text input
    'number',       -- Numeric input
    'address',      -- Single address field (structured in data)
    'time',         -- Time input (HH:MM)
    'date',         -- Date(s) with modes: single, range, multiple, flexible
    'selection',    -- Selection with types: dropdown, radio, multiple
    'rating'        -- Importance rating (1-5 scale)
  ));

ALTER TABLE brief_questions ADD CONSTRAINT brief_questions_type_check
  CHECK (type IN (
    -- Structure blocks (no response expected)
    'title',
    'description',
    'separator',
    'media',
    -- Data collection blocks
    'text_short',
    'text_long',
    'number',
    'address',
    'time',
    'date',
    'selection',
    'rating'
  ));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN brief_template_questions.type IS 'Question type: structure (title, description, separator, media) or data collection (text_short, text_long, number, address, time, date, selection, rating)';
COMMENT ON COLUMN brief_questions.type IS 'Question type copied from template';
