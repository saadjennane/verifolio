-- Migration 063: Send Module - Public Links & Tracking Events
-- Centralise la gestion des liens publics et le tracking des evenements

-- ============================================================================
-- TABLE: public_links
-- Gestion centralisee de tous les liens publics (briefs, proposals, quotes, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identification de la ressource
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'brief', 'proposal', 'quote', 'invoice', 'review_request'
  )),
  resource_id UUID NOT NULL,

  -- Token d'acces unique
  token TEXT NOT NULL,

  -- Gestion du cycle de vie
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour recherche par ressource
CREATE INDEX IF NOT EXISTS idx_public_links_user ON public_links(user_id);
CREATE INDEX IF NOT EXISTS idx_public_links_resource ON public_links(resource_type, resource_id);

-- Index unique sur token (seulement pour liens non revoques)
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_links_token_active
  ON public_links(token)
  WHERE NOT is_revoked;

-- Contrainte: un seul lien actif par ressource
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_links_resource_active
  ON public_links(resource_type, resource_id)
  WHERE NOT is_revoked;

-- ============================================================================
-- TABLE: tracking_events
-- Suivi des evenements pour analytics (email_sent, viewer_opened, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contexte de la ressource
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'brief', 'proposal', 'quote', 'invoice', 'review_request'
  )),
  resource_id UUID NOT NULL,
  public_link_id UUID REFERENCES public_links(id) ON DELETE SET NULL,

  -- Type d'evenement
  event_type TEXT NOT NULL CHECK (event_type IN (
    'email_sent',       -- Email envoye
    'link_clicked',     -- Lien clique (redirect tracking)
    'viewer_opened',    -- Page viewer ouverte (premiere visite)
    'pdf_downloaded',   -- PDF telecharge
    'submitted',        -- Formulaire soumis (brief, review)
    'accepted',         -- Proposition acceptee
    'refused'           -- Proposition refusee
  )),

  -- Donnees additionnelles
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_tracking_events_user ON tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_resource ON tracking_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created ON tracking_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_link ON tracking_events(public_link_id);

-- Index composite pour verifier si deja tracke (premiere visite)
CREATE INDEX IF NOT EXISTS idx_tracking_events_first_view
  ON tracking_events(resource_type, resource_id, event_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- Public Links: utilisateurs peuvent gerer leurs propres liens
DROP POLICY IF EXISTS public_links_owner_select ON public_links;
CREATE POLICY public_links_owner_select ON public_links
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS public_links_owner_insert ON public_links;
CREATE POLICY public_links_owner_insert ON public_links
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS public_links_owner_update ON public_links;
CREATE POLICY public_links_owner_update ON public_links
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS public_links_owner_delete ON public_links;
CREATE POLICY public_links_owner_delete ON public_links
  FOR DELETE USING (user_id = auth.uid());

-- Tracking Events: lecture pour le proprietaire, insertion libre (pour tracking public)
DROP POLICY IF EXISTS tracking_events_owner_select ON tracking_events;
CREATE POLICY tracking_events_owner_select ON tracking_events
  FOR SELECT USING (user_id = auth.uid());

-- Permettre l'insertion depuis les pages publiques (service role ou anonymous)
DROP POLICY IF EXISTS tracking_events_insert_all ON tracking_events;
CREATE POLICY tracking_events_insert_all ON tracking_events
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Generate public token
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_public_token(length INTEGER DEFAULT 32)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public_links IS 'Liens publics centralises pour tous les types de documents';
COMMENT ON TABLE tracking_events IS 'Evenements de tracking pour analytics (premiere visite uniquement)';
COMMENT ON COLUMN public_links.is_revoked IS 'Si true, le lien n''est plus valide';
COMMENT ON COLUMN public_links.expires_at IS 'Date d''expiration optionnelle du lien';
COMMENT ON COLUMN tracking_events.event_type IS 'Type: email_sent, viewer_opened, pdf_downloaded, submitted, accepted, refused';
COMMENT ON COLUMN tracking_events.metadata IS 'Donnees additionnelles (recipient_count, token, etc.)';
