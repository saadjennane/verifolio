-- Migration 066: Review Templates
-- Templates configurables pour les demandes d'avis clients

-- ============================================================================
-- Table: review_templates
-- ============================================================================
CREATE TABLE review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Nom de la template
  name TEXT NOT NULL,
  description TEXT,

  -- Critères d'évaluation par étoiles (3-4 max, stockés en JSONB)
  -- Format: [{ "id": "uuid", "label": "Qualité du travail", "order": 0 }, ...]
  rating_criteria JSONB NOT NULL DEFAULT '[]',

  -- Placeholder du champ texte libre (avis global)
  text_placeholder TEXT NOT NULL DEFAULT 'En quelques mots, comment s''est passée la collaboration ?',

  -- Placeholder conditionnel pour notes basses (1-2 étoiles)
  low_rating_placeholder TEXT NOT NULL DEFAULT 'Pouvez-vous nous dire ce qui pourrait être amélioré ?',

  -- Paramètres
  show_text_field BOOLEAN NOT NULL DEFAULT true,
  show_low_rating_field BOOLEAN NOT NULL DEFAULT true,

  -- Template par défaut
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_review_templates_user ON review_templates(user_id);
CREATE INDEX idx_review_templates_default ON review_templates(user_id, is_default) WHERE is_default = true;

-- Trigger updated_at
CREATE TRIGGER review_templates_updated_at
  BEFORE UPDATE ON review_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_templates_all" ON review_templates
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Function: Ensure only one default template per user
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_single_default_review_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE review_templates
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_templates_single_default
  AFTER INSERT OR UPDATE OF is_default ON review_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_review_template();

-- ============================================================================
-- Add template_id to review_requests
-- ============================================================================
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES review_templates(id) ON DELETE SET NULL;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE review_templates IS 'Templates configurables pour les demandes d''avis clients';
COMMENT ON COLUMN review_templates.rating_criteria IS 'Critères d''évaluation par étoiles (3-4 max). Format JSON: [{"id": "uuid", "label": "string", "order": number}]';
COMMENT ON COLUMN review_templates.text_placeholder IS 'Placeholder du champ de texte libre pour l''avis global';
COMMENT ON COLUMN review_templates.low_rating_placeholder IS 'Placeholder affiché quand une note est 1 ou 2 étoiles';
COMMENT ON COLUMN review_templates.show_text_field IS 'Afficher le champ de texte libre';
COMMENT ON COLUMN review_templates.show_low_rating_field IS 'Afficher le champ conditionnel pour notes basses';
