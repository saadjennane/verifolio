-- Migration: Deals System
-- Description: Cycle commercial - opportunités avec statuts exclusifs

-- ============================================================================
-- DEALS TABLE
-- ============================================================================

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- Statuts exclusifs
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'draft', 'sent', 'won', 'lost', 'archived')),

  -- Montants estimés
  estimated_amount DECIMAL(10, 2),
  final_amount DECIMAL(10, 2),

  -- Dates importantes
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Relation mission (créée si won) - sera ajoutée après création de la table missions
  mission_id UUID,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_deals_user ON deals(user_id);
CREATE INDEX idx_deals_client ON deals(client_id);
CREATE INDEX idx_deals_status ON deals(user_id, status);
CREATE INDEX idx_deals_mission ON deals(mission_id);

-- RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own deals"
  ON deals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DEAL CONTACTS (liaison deals <-> contacts)
-- ============================================================================

CREATE TABLE deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role spécifique dans ce deal
  role TEXT,
  is_primary BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un contact unique par deal
  CONSTRAINT unique_deal_contact UNIQUE (deal_id, contact_id)
);

-- Index
CREATE INDEX idx_deal_contacts_deal ON deal_contacts(deal_id);
CREATE INDEX idx_deal_contacts_contact ON deal_contacts(contact_id);

-- RLS
ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage contacts in their deals"
  ON deal_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_contacts.deal_id
      AND deals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_contacts.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DEAL DOCUMENTS (liaison deals <-> quotes/proposals)
-- ============================================================================

CREATE TABLE deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  -- Type de document
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'proposal')),

  -- Référence au document
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte : soit quote_id, soit proposal_id
  CONSTRAINT check_document_reference CHECK (
    (document_type = 'quote' AND quote_id IS NOT NULL AND proposal_id IS NULL) OR
    (document_type = 'proposal' AND proposal_id IS NOT NULL AND quote_id IS NULL)
  ),

  -- Un document unique par deal
  CONSTRAINT unique_deal_document UNIQUE (deal_id, document_type, quote_id, proposal_id)
);

-- Index
CREATE INDEX idx_deal_documents_deal ON deal_documents(deal_id);
CREATE INDEX idx_deal_documents_quote ON deal_documents(quote_id);
CREATE INDEX idx_deal_documents_proposal ON deal_documents(proposal_id);

-- RLS
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents in their deals"
  ON deal_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_documents.deal_id
      AND deals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_documents.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DEAL TAGS (étiquettes personnalisées)
-- ============================================================================

CREATE TABLE deal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  tag TEXT NOT NULL,
  color TEXT DEFAULT 'gray',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un tag unique par deal
  CONSTRAINT unique_deal_tag UNIQUE (deal_id, tag)
);

-- Index
CREATE INDEX idx_deal_tags_deal ON deal_tags(deal_id);

-- RLS
ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tags in their deals"
  ON deal_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_tags.deal_id
      AND deals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_tags.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DEAL BADGES (badges de contexte)
-- ============================================================================

CREATE TABLE deal_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  badge TEXT NOT NULL,
  variant TEXT DEFAULT 'default',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un badge unique par deal
  CONSTRAINT unique_deal_badge UNIQUE (deal_id, badge)
);

-- Index
CREATE INDEX idx_deal_badges_deal ON deal_badges(deal_id);

-- RLS
ALTER TABLE deal_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage badges in their deals"
  ON deal_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_badges.deal_id
      AND deals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_badges.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER pour updated_at
-- ============================================================================

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTION: Auto-update status dates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_deal_status_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand le statut change, mettre à jour les dates correspondantes
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'sent' THEN
        NEW.sent_at = now();
      WHEN 'won' THEN
        NEW.won_at = now();
      WHEN 'lost' THEN
        NEW.lost_at = now();
      WHEN 'archived' THEN
        NEW.archived_at = now();
      ELSE
        -- Pour new et draft, pas de date spécifique
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_status_dates
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_status_dates();

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE deals IS 'Opportunités commerciales avec statuts exclusifs';
COMMENT ON TABLE deal_contacts IS 'Contacts liés à un deal';
COMMENT ON TABLE deal_documents IS 'Documents (devis/propositions) liés à un deal';
COMMENT ON TABLE deal_tags IS 'Tags personnalisés pour contexte';
COMMENT ON TABLE deal_badges IS 'Badges de statut/contexte';

COMMENT ON COLUMN deals.status IS 'Statuts exclusifs: new, draft, sent, won, lost, archived';
COMMENT ON COLUMN deals.mission_id IS 'Mission créée si deal won';
