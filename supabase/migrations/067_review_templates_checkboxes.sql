-- Migration 067: Add checkboxes to review templates
-- Cases à cocher configurables pour les demandes d'avis

-- ============================================================================
-- Add columns to review_templates
-- ============================================================================

-- Checkboxes configurables (max 4)
-- Format: [{ "id": "uuid", "label": "Je confirme avoir collaboré avec ...", "order": 0, "is_visible": true }, ...]
ALTER TABLE review_templates
  ADD COLUMN IF NOT EXISTS checkboxes JSONB NOT NULL DEFAULT '[
    {"id": "confirm_collaboration", "label": "Je confirme avoir collaboré avec ...", "order": 0, "is_visible": true},
    {"id": "consent_display", "label": "J''autorise l''affichage de mon nom et de ma fonction", "order": 1, "is_visible": true}
  ]';

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN review_templates.checkboxes IS 'Cases à cocher configurables (max 4). Format JSON: [{"id": "uuid", "label": "string", "order": number, "is_visible": boolean}]';
