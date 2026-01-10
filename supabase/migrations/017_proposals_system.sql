-- ============================================================================
-- Migration 017: Proposals System (Silo Propositions v1)
-- ============================================================================

-- ============================================================================
-- 1) proposal_templates
-- ============================================================================

CREATE TABLE proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  style_key TEXT NOT NULL DEFAULT 'classic' CHECK (style_key IN ('classic', 'modern', 'elegant')),
  accent_color TEXT NOT NULL DEFAULT '#111111',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_proposal_templates_user_id ON proposal_templates(user_id);

-- Trigger for updated_at
CREATE TRIGGER set_proposal_templates_updated_at
  BEFORE UPDATE ON proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposal_templates IS 'Templates de propositions commerciales';
COMMENT ON COLUMN proposal_templates.style_key IS 'Style visuel: classic, modern, elegant';
COMMENT ON COLUMN proposal_templates.accent_color IS 'Couleur accent hexadecimale';

-- ============================================================================
-- 2) proposal_template_sections
-- ============================================================================

CREATE TABLE proposal_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES proposal_templates(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'video')),
  media_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Contrainte: media_url obligatoire si media_type != 'none'
  CONSTRAINT chk_media_url_required CHECK (
    (media_type = 'none' AND media_url IS NULL) OR
    (media_type IN ('image', 'video') AND media_url IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_proposal_template_sections_template_sort ON proposal_template_sections(template_id, sort_order);

-- Trigger for updated_at
CREATE TRIGGER set_proposal_template_sections_updated_at
  BEFORE UPDATE ON proposal_template_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposal_template_sections IS 'Sections des templates de propositions';
COMMENT ON COLUMN proposal_template_sections.body IS 'Texte avec variables type {{client_name}}';
COMMENT ON COLUMN proposal_template_sections.media_type IS 'Type de media: none, image, video';

-- ============================================================================
-- 3) proposals
-- ============================================================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES proposal_templates(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'commented', 'accepted', 'refused')),
  variables JSONB NOT NULL DEFAULT '{}',
  linked_quote_id UUID NULL REFERENCES quotes(id) ON DELETE SET NULL,
  public_token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMPTZ NULL,
  accepted_at TIMESTAMPTZ NULL,
  refused_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_proposals_user_client ON proposals(user_id, client_id);
CREATE INDEX idx_proposals_user_status ON proposals(user_id, status);
CREATE INDEX idx_proposals_public_token ON proposals(public_token);

-- Trigger for updated_at
CREATE TRIGGER set_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE proposals IS 'Propositions commerciales envoyees aux clients';
COMMENT ON COLUMN proposals.variables IS 'Valeurs des variables du template (JSON)';
COMMENT ON COLUMN proposals.public_token IS 'Token unique pour acces public (lien client)';
COMMENT ON COLUMN proposals.status IS 'Statut: draft, sent, commented, accepted, refused';

-- ============================================================================
-- 4) proposal_recipients
-- ============================================================================

CREATE TABLE proposal_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Contrainte unique: un contact ne peut etre lie qu'une fois a une proposition
  CONSTRAINT uq_proposal_recipient UNIQUE (proposal_id, contact_id)
);

-- Indexes
CREATE INDEX idx_proposal_recipients_proposal ON proposal_recipients(proposal_id);
CREATE INDEX idx_proposal_recipients_contact ON proposal_recipients(contact_id);

COMMENT ON TABLE proposal_recipients IS 'Contacts destinataires dune proposition';

-- ============================================================================
-- 5) proposal_comments
-- ============================================================================

CREATE TABLE proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_id UUID NULL REFERENCES proposal_template_sections(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('client', 'user')),
  author_name TEXT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_proposal_comments_proposal_section ON proposal_comments(proposal_id, section_id);
CREATE INDEX idx_proposal_comments_proposal ON proposal_comments(proposal_id);

COMMENT ON TABLE proposal_comments IS 'Commentaires sur les propositions';
COMMENT ON COLUMN proposal_comments.section_id IS 'Section commentee (null = commentaire general)';
COMMENT ON COLUMN proposal_comments.author_type IS 'Type auteur: client (externe) ou user (interne)';
COMMENT ON COLUMN proposal_comments.author_name IS 'Nom affiche pour les commentaires client';

-- ============================================================================
-- RLS: Enable Row Level Security
-- ============================================================================

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: proposal_templates
-- ============================================================================

CREATE POLICY "Users can view own proposal templates"
  ON proposal_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own proposal templates"
  ON proposal_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proposal templates"
  ON proposal_templates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own proposal templates"
  ON proposal_templates FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS Policies: proposal_template_sections
-- ============================================================================

CREATE POLICY "Users can view own template sections"
  ON proposal_template_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own template sections"
  ON proposal_template_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own template sections"
  ON proposal_template_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own template sections"
  ON proposal_template_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates pt
      WHERE pt.id = proposal_template_sections.template_id
      AND pt.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: proposals
-- ============================================================================

CREATE POLICY "Users can view own proposals"
  ON proposals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own proposals"
  ON proposals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
  ON proposals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own proposals"
  ON proposals FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS Policies: proposal_recipients
-- ============================================================================

CREATE POLICY "Users can view own proposal recipients"
  ON proposal_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_recipients.proposal_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own proposal recipients"
  ON proposal_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_recipients.proposal_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proposal recipients"
  ON proposal_recipients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_recipients.proposal_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: proposal_comments
-- ============================================================================

-- Users can view comments on their own proposals
CREATE POLICY "Users can view own proposal comments"
  ON proposal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_comments.proposal_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can create comments on their own proposals (author_type = 'user')
CREATE POLICY "Users can create own proposal comments"
  ON proposal_comments FOR INSERT
  WITH CHECK (
    author_type = 'user' AND
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_comments.proposal_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can delete comments on their own proposals
CREATE POLICY "Users can delete own proposal comments"
  ON proposal_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_comments.proposal_id
      AND p.user_id = auth.uid()
    )
  );

-- Note: Les commentaires clients (author_type = 'client') seront inseres
-- via une server route qui bypass RLS avec le service role key.
-- Pas de policy publique pour eviter les abus.
