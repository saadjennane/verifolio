-- ============================================================================
-- Migration 060: Briefs System Schema
-- ============================================================================
-- Brief Builder for collecting project information from clients
-- Briefs are always created from templates and linked to deals

-- ============================================================================
-- TEMPLATES
-- ============================================================================

-- Brief templates (user-owned)
CREATE TABLE brief_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template questions (building blocks)
CREATE TABLE brief_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES brief_templates(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'title',        -- Section title (structure)
    'description',  -- Explanatory text (structure)
    'separator',    -- Visual separator (structure)
    'text_short',   -- Short text input
    'text_long',    -- Multi-line text input
    'number',       -- Numeric input
    'address',      -- Structured address (lieu, adresse, ville, pays)
    'date',         -- Date(s) with modes: single, range, multiple, flexible
    'selection'     -- Selection with modes: dropdown, radio, checkbox
  )),
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  -- config examples:
  -- date: { "mode": "single" | "range" | "multiple" | "flexible" }
  -- selection: { "mode": "dropdown" | "radio" | "checkbox", "options": ["A", "B"], "allowOther": true }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BRIEFS
-- ============================================================================

-- Main briefs table
CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES brief_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'RESPONDED')),
  public_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brief questions (instance copies from template)
CREATE TABLE brief_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'title', 'description', 'separator',
    'text_short', 'text_long', 'number',
    'address', 'date', 'selection'
  )),
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses to questions (from client)
CREATE TABLE brief_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES brief_questions(id) ON DELETE CASCADE,
  value TEXT,
  -- structured_value for complex types like address or multiple dates
  structured_value JSONB,
  -- address example: { "lieu": "...", "adresse": "...", "ville": "...", "pays": "..." }
  -- date range: { "start": "2024-01-01", "end": "2024-01-31" }
  -- multiple dates: ["2024-01-01", "2024-01-15", "2024-02-01"]
  -- multiple selection: ["Option A", "Option C"]
  responded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one response per question
  CONSTRAINT unique_question_response UNIQUE (question_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Templates
CREATE INDEX idx_brief_templates_user ON brief_templates(user_id);
CREATE INDEX idx_brief_templates_default ON brief_templates(user_id, is_default) WHERE is_default = true;

-- Template questions
CREATE INDEX idx_brief_template_questions_template ON brief_template_questions(template_id);
CREATE INDEX idx_brief_template_questions_position ON brief_template_questions(template_id, position);

-- Briefs
CREATE INDEX idx_briefs_user ON briefs(user_id);
CREATE INDEX idx_briefs_deal ON briefs(deal_id);
CREATE INDEX idx_briefs_client ON briefs(client_id);
CREATE INDEX idx_briefs_status ON briefs(status);
CREATE INDEX idx_briefs_public_token ON briefs(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_briefs_deleted ON briefs(deleted_at) WHERE deleted_at IS NOT NULL;

-- Brief questions
CREATE INDEX idx_brief_questions_brief ON brief_questions(brief_id);
CREATE INDEX idx_brief_questions_position ON brief_questions(brief_id, position);

-- Responses
CREATE INDEX idx_brief_responses_question ON brief_responses(question_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE brief_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_responses ENABLE ROW LEVEL SECURITY;

-- Templates: owner access only
CREATE POLICY brief_templates_owner ON brief_templates
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY brief_template_questions_owner ON brief_template_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brief_templates
      WHERE brief_templates.id = brief_template_questions.template_id
      AND brief_templates.user_id = auth.uid()
    )
  );

-- Briefs: owner access only
CREATE POLICY briefs_owner ON briefs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY brief_questions_owner ON brief_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM briefs
      WHERE briefs.id = brief_questions.brief_id
      AND briefs.user_id = auth.uid()
    )
  );

CREATE POLICY brief_responses_owner ON brief_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brief_questions
      JOIN briefs ON briefs.id = brief_questions.brief_id
      WHERE brief_questions.id = brief_responses.question_id
      AND briefs.user_id = auth.uid()
    )
  );

-- Public access for responses (client submitting via public token)
-- Note: Public submission will use service role or a separate RPC function

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on briefs
CREATE TRIGGER update_briefs_updated_at
  BEFORE UPDATE ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on brief_templates
CREATE TRIGGER update_brief_templates_updated_at
  BEFORE UPDATE ON brief_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE brief_templates IS 'User-defined brief templates with reusable question structures';
COMMENT ON TABLE brief_template_questions IS 'Questions/blocks within a brief template';
COMMENT ON TABLE briefs IS 'Brief instances created from templates, linked to deals';
COMMENT ON TABLE brief_questions IS 'Instance copies of template questions for a specific brief';
COMMENT ON TABLE brief_responses IS 'Client responses to brief questions';

COMMENT ON COLUMN briefs.status IS 'DRAFT: editing, SENT: awaiting response, RESPONDED: client submitted';
COMMENT ON COLUMN briefs.public_token IS 'Unique token for public access (e.g., /b/{token})';
COMMENT ON COLUMN brief_questions.config IS 'Type-specific configuration (date modes, selection options, etc.)';
COMMENT ON COLUMN brief_responses.structured_value IS 'Complex response data (address fields, multiple dates, etc.)';
