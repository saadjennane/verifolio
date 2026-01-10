-- ============================================================================
-- Migration 043: Proposals v2 Schema
-- Refonte du système de propositions avec lien deal obligatoire
-- ============================================================================

-- ============================================================================
-- 1) Modifier proposal_templates
--    Ajouter: theme (jsonb), is_default, owner_user_id
--    Retirer: style_key, accent_color (remplacés par theme)
-- ============================================================================

-- Ajouter les nouvelles colonnes
ALTER TABLE proposal_templates
  ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT '{"primaryColor": "#111111", "accentColor": "#3B82F6", "font": "Inter"}',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrer les données existantes vers le nouveau format theme
UPDATE proposal_templates
SET theme = jsonb_build_object(
  'primaryColor', COALESCE(accent_color, '#111111'),
  'accentColor', CASE
    WHEN style_key = 'modern' THEN '#3B82F6'
    WHEN style_key = 'elegant' THEN '#8B5CF6'
    ELSE '#111111'
  END,
  'font', CASE
    WHEN style_key = 'modern' THEN 'Inter'
    WHEN style_key = 'elegant' THEN 'Playfair Display'
    ELSE 'Inter'
  END
)
WHERE theme = '{"primaryColor": "#111111", "accentColor": "#3B82F6", "font": "Inter"}'::jsonb;

-- Renommer user_id en owner_user_id pour cohérence
ALTER TABLE proposal_templates RENAME COLUMN user_id TO owner_user_id;

-- Supprimer les anciennes colonnes (après migration des données)
ALTER TABLE proposal_templates
  DROP COLUMN IF EXISTS style_key,
  DROP COLUMN IF EXISTS accent_color;

COMMENT ON COLUMN proposal_templates.theme IS 'Theme visuel: {primaryColor, accentColor, font}';
COMMENT ON COLUMN proposal_templates.is_default IS 'Template par defaut pour les nouvelles propositions';
COMMENT ON COLUMN proposal_templates.description IS 'Description du template';

-- ============================================================================
-- 2) Modifier proposal_template_sections
--    Renommer sort_order → position, ajouter is_enabled
--    Supprimer media_type/media_url (simplification)
-- ============================================================================

-- Ajouter is_enabled
ALTER TABLE proposal_template_sections
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

-- Renommer sort_order en position
ALTER TABLE proposal_template_sections RENAME COLUMN sort_order TO position;

-- Supprimer les colonnes media (simplification)
ALTER TABLE proposal_template_sections
  DROP CONSTRAINT IF EXISTS chk_media_url_required,
  DROP COLUMN IF EXISTS media_type,
  DROP COLUMN IF EXISTS media_url;

-- Recréer l'index avec le nouveau nom
DROP INDEX IF EXISTS idx_proposal_template_sections_template_sort;
CREATE INDEX IF NOT EXISTS idx_proposal_template_sections_template_position
  ON proposal_template_sections(template_id, position);

COMMENT ON COLUMN proposal_template_sections.position IS 'Ordre d affichage de la section';
COMMENT ON COLUMN proposal_template_sections.is_enabled IS 'Section active ou masquee';

-- ============================================================================
-- 3) Modifier proposals
--    Ajouter: deal_id (NOT NULL), theme_override
--    Renommer: user_id → owner_user_id
--    Changer: status enum
-- ============================================================================

-- Ajouter deal_id (nullable d'abord pour les données existantes)
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE CASCADE;

-- Ajouter theme_override
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS theme_override JSONB;

-- Renommer user_id en owner_user_id
ALTER TABLE proposals RENAME COLUMN user_id TO owner_user_id;

-- Mettre à jour la contrainte de statut (DRAFT, SENT, ACCEPTED, REFUSED)
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REFUSED'));

-- Migrer les anciens statuts vers les nouveaux
UPDATE proposals SET status = UPPER(status) WHERE status = LOWER(status);
UPDATE proposals SET status = 'REFUSED' WHERE status = 'COMMENTED';

-- Supprimer les colonnes inutilisées
ALTER TABLE proposals
  DROP COLUMN IF EXISTS linked_quote_id,
  DROP COLUMN IF EXISTS variables;

-- Créer l'index sur deal_id
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON proposals(deal_id);

COMMENT ON COLUMN proposals.deal_id IS 'Deal lie a la proposition (obligatoire)';
COMMENT ON COLUMN proposals.theme_override IS 'Surcharge du theme du template';
COMMENT ON COLUMN proposals.status IS 'Statut: DRAFT, SENT, ACCEPTED, REFUSED';

-- ============================================================================
-- 4) Créer proposal_sections (copies d'instance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal_position
  ON proposal_sections(proposal_id, position);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS set_proposal_sections_updated_at ON proposal_sections;
CREATE TRIGGER set_proposal_sections_updated_at
  BEFORE UPDATE ON proposal_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposal_sections IS 'Sections d une proposition (copies du template)';
COMMENT ON COLUMN proposal_sections.body IS 'Contenu avec variables resolues ou non';
COMMENT ON COLUMN proposal_sections.position IS 'Ordre d affichage';
COMMENT ON COLUMN proposal_sections.is_enabled IS 'Section visible ou masquee';

-- ============================================================================
-- 5) Créer proposal_variables
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Contrainte unique sur (proposal_id, key)
  CONSTRAINT uq_proposal_variable UNIQUE (proposal_id, key)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_proposal_variables_proposal
  ON proposal_variables(proposal_id);

COMMENT ON TABLE proposal_variables IS 'Variables personnalisees par proposition';
COMMENT ON COLUMN proposal_variables.key IS 'Nom de la variable (sans {{}})';
COMMENT ON COLUMN proposal_variables.value IS 'Valeur de la variable';

-- ============================================================================
-- RLS: proposal_sections
-- ============================================================================

ALTER TABLE proposal_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposal sections"
  ON proposal_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_sections.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own proposal sections"
  ON proposal_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_sections.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own proposal sections"
  ON proposal_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_sections.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_sections.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proposal sections"
  ON proposal_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_sections.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS: proposal_variables
-- ============================================================================

ALTER TABLE proposal_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposal variables"
  ON proposal_variables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_variables.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own proposal variables"
  ON proposal_variables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_variables.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own proposal variables"
  ON proposal_variables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_variables.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_variables.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proposal variables"
  ON proposal_variables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_variables.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Mise à jour des policies existantes (renommer user_id → owner_user_id)
-- ============================================================================

-- proposal_templates policies
DROP POLICY IF EXISTS "Users can view own proposal templates" ON proposal_templates;
DROP POLICY IF EXISTS "Users can create own proposal templates" ON proposal_templates;
DROP POLICY IF EXISTS "Users can update own proposal templates" ON proposal_templates;
DROP POLICY IF EXISTS "Users can delete own proposal templates" ON proposal_templates;

CREATE POLICY "Users can view own proposal templates"
  ON proposal_templates FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create own proposal templates"
  ON proposal_templates FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own proposal templates"
  ON proposal_templates FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own proposal templates"
  ON proposal_templates FOR DELETE
  USING (owner_user_id = auth.uid());

-- proposal_template_sections policies (mise à jour pour owner_user_id)
DROP POLICY IF EXISTS "Users can view own template sections" ON proposal_template_sections;
DROP POLICY IF EXISTS "Users can create own template sections" ON proposal_template_sections;
DROP POLICY IF EXISTS "Users can update own template sections" ON proposal_template_sections;
DROP POLICY IF EXISTS "Users can delete own template sections" ON proposal_template_sections;

CREATE POLICY "Users can view own template sections"
  ON proposal_template_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own template sections"
  ON proposal_template_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own template sections"
  ON proposal_template_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own template sections"
  ON proposal_template_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.owner_user_id = auth.uid()
    )
  );

-- proposals policies (mise à jour pour owner_user_id)
DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can create own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON proposals;

CREATE POLICY "Users can view own proposals"
  ON proposals FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create own proposals"
  ON proposals FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
  ON proposals FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own proposals"
  ON proposals FOR DELETE
  USING (owner_user_id = auth.uid());

-- proposal_recipients policies (mise à jour pour owner_user_id)
DROP POLICY IF EXISTS "Users can view own proposal recipients" ON proposal_recipients;
DROP POLICY IF EXISTS "Users can create own proposal recipients" ON proposal_recipients;
DROP POLICY IF EXISTS "Users can delete own proposal recipients" ON proposal_recipients;

CREATE POLICY "Users can view own proposal recipients"
  ON proposal_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_recipients.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own proposal recipients"
  ON proposal_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_recipients.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proposal recipients"
  ON proposal_recipients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_recipients.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- proposal_comments policies (mise à jour pour owner_user_id)
DROP POLICY IF EXISTS "Users can view own proposal comments" ON proposal_comments;
DROP POLICY IF EXISTS "Users can create own proposal comments" ON proposal_comments;
DROP POLICY IF EXISTS "Users can delete own proposal comments" ON proposal_comments;

CREATE POLICY "Users can view own proposal comments"
  ON proposal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_comments.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own proposal comments"
  ON proposal_comments FOR INSERT
  WITH CHECK (
    author_type = 'user' AND
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_comments.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proposal comments"
  ON proposal_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_comments.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Mise à jour de la FK proposal_comments.section_id
-- Elle pointait vers proposal_template_sections, maintenant vers proposal_sections
-- ============================================================================

ALTER TABLE proposal_comments
  DROP CONSTRAINT IF EXISTS proposal_comments_section_id_fkey;

ALTER TABLE proposal_comments
  ADD CONSTRAINT proposal_comments_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES proposal_sections(id) ON DELETE CASCADE;
