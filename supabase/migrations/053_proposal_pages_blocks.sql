-- ============================================================================
-- Migration 053: Proposal Pages & Blocks (TipTap Editor)
-- Structure pages/sections/blocs pour l'éditeur de propositions
-- ============================================================================

-- ============================================================================
-- 1) Types ENUM pour les blocs
-- ============================================================================

CREATE TYPE proposal_block_type AS ENUM (
  'text',              -- Paragraphe/heading avec TipTap
  'text_two_columns',  -- 2 colonnes 50/50
  'image',             -- Image simple
  'video',             -- YouTube/Vimeo embed
  'image_text_left',   -- Image à gauche, texte à droite
  'image_text_right',  -- Texte à gauche, image à droite
  'table',             -- Tableau TipTap (max 5 colonnes)
  'separator'          -- Ligne horizontale
);

-- ============================================================================
-- 2) Table: proposal_pages
-- ============================================================================

CREATE TABLE proposal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Page sans titre',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_proposal_pages_proposal ON proposal_pages(proposal_id);
CREATE INDEX idx_proposal_pages_sort ON proposal_pages(proposal_id, sort_order);

-- Trigger updated_at
CREATE TRIGGER set_proposal_pages_updated_at
  BEFORE UPDATE ON proposal_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposal_pages IS 'Pages d''une proposition';
COMMENT ON COLUMN proposal_pages.sort_order IS 'Ordre d''affichage de la page';

-- ============================================================================
-- 3) Table: proposal_page_sections
-- ============================================================================

CREATE TABLE proposal_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES proposal_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Section',
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_proposal_page_sections_page ON proposal_page_sections(page_id);
CREATE INDEX idx_proposal_page_sections_sort ON proposal_page_sections(page_id, sort_order);

-- Trigger updated_at
CREATE TRIGGER set_proposal_page_sections_updated_at
  BEFORE UPDATE ON proposal_page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposal_page_sections IS 'Sections d''une page de proposition';
COMMENT ON COLUMN proposal_page_sections.is_highlighted IS 'Section mise en avant visuellement';

-- ============================================================================
-- 4) Table: proposal_blocks
-- ============================================================================

CREATE TABLE proposal_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES proposal_page_sections(id) ON DELETE CASCADE,
  type proposal_block_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_proposal_blocks_section ON proposal_blocks(section_id);
CREATE INDEX idx_proposal_blocks_sort ON proposal_blocks(section_id, sort_order);

-- Trigger updated_at
CREATE TRIGGER set_proposal_blocks_updated_at
  BEFORE UPDATE ON proposal_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposal_blocks IS 'Blocs de contenu d''une section';
COMMENT ON COLUMN proposal_blocks.type IS 'Type de bloc: text, image, video, table, etc.';
COMMENT ON COLUMN proposal_blocks.content IS 'Contenu du bloc en JSON (structure dépend du type)';

-- ============================================================================
-- 5) RLS Policies: proposal_pages
-- ============================================================================

ALTER TABLE proposal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_pages_select_own" ON proposal_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_pages.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_pages_insert_own" ON proposal_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_pages.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_pages_update_own" ON proposal_pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_pages.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_pages_delete_own" ON proposal_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_pages.proposal_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6) RLS Policies: proposal_page_sections
-- ============================================================================

ALTER TABLE proposal_page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_page_sections_select_own" ON proposal_page_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposal_pages pg
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE pg.id = proposal_page_sections.page_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_page_sections_insert_own" ON proposal_page_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_pages pg
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE pg.id = proposal_page_sections.page_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_page_sections_update_own" ON proposal_page_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM proposal_pages pg
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE pg.id = proposal_page_sections.page_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_page_sections_delete_own" ON proposal_page_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM proposal_pages pg
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE pg.id = proposal_page_sections.page_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7) RLS Policies: proposal_blocks
-- ============================================================================

ALTER TABLE proposal_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_blocks_select_own" ON proposal_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposal_page_sections ps
      JOIN proposal_pages pg ON pg.id = ps.page_id
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE ps.id = proposal_blocks.section_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_blocks_insert_own" ON proposal_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_page_sections ps
      JOIN proposal_pages pg ON pg.id = ps.page_id
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE ps.id = proposal_blocks.section_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_blocks_update_own" ON proposal_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM proposal_page_sections ps
      JOIN proposal_pages pg ON pg.id = ps.page_id
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE ps.id = proposal_blocks.section_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "proposal_blocks_delete_own" ON proposal_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM proposal_page_sections ps
      JOIN proposal_pages pg ON pg.id = ps.page_id
      JOIN proposals p ON p.id = pg.proposal_id
      WHERE ps.id = proposal_blocks.section_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8) Trigger: Créer une page par défaut à la création d'une proposition
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_proposal_page()
RETURNS TRIGGER AS $$
DECLARE
  v_page_id UUID;
  v_section_id UUID;
BEGIN
  -- Créer la première page
  INSERT INTO proposal_pages (proposal_id, title, sort_order)
  VALUES (NEW.id, 'Introduction', 0)
  RETURNING id INTO v_page_id;

  -- Créer une section par défaut
  INSERT INTO proposal_page_sections (page_id, title, sort_order)
  VALUES (v_page_id, 'Présentation', 0)
  RETURNING id INTO v_section_id;

  -- Créer un bloc texte par défaut
  INSERT INTO proposal_blocks (section_id, type, content, sort_order)
  VALUES (
    v_section_id,
    'text',
    '{"html": "<h1>Votre proposition</h1><p>Commencez à rédiger votre proposition ici...</p>"}',
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_page_on_proposal_create
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION create_default_proposal_page();
