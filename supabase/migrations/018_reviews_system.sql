-- Migration: Reviews System
-- Description: Système de demandes et collecte d'avis clients pour témoignages

-- ============================================================================
-- 1. REVIEW REQUESTS (Demandes d'avis)
-- ============================================================================

CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  context_text TEXT,

  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'responded')),

  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reminded_at TIMESTAMPTZ,

  public_token TEXT NOT NULL UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule request principale par facture (v1)
  CONSTRAINT unique_request_per_invoice UNIQUE (user_id, invoice_id)
);

-- Indexes
CREATE INDEX idx_review_requests_user_client ON review_requests(user_id, client_id);
CREATE INDEX idx_review_requests_user_status ON review_requests(user_id, status);
CREATE INDEX idx_review_requests_invoice ON review_requests(invoice_id);

-- RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own review requests"
  ON review_requests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. REVIEW REQUEST RECIPIENTS (Destinataires)
-- ============================================================================

CREATE TABLE review_request_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'responded')),

  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,

  -- Un destinataire unique par email par request
  CONSTRAINT unique_recipient_email UNIQUE (review_request_id, email)
);

-- Index
CREATE INDEX idx_review_recipients_request ON review_request_recipients(review_request_id);

-- RLS
ALTER TABLE review_request_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recipients of their review requests"
  ON review_request_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM review_requests
      WHERE review_requests.id = review_request_recipients.review_request_id
      AND review_requests.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_requests
      WHERE review_requests.id = review_request_recipients.review_request_id
      AND review_requests.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. REVIEWS (Avis clients)
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_request_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Informations du reviewer
  reviewer_name TEXT,
  reviewer_role TEXT,
  reviewer_email TEXT NOT NULL,
  reviewer_company TEXT,

  -- Confirmations
  confirm_collaboration BOOLEAN NOT NULL DEFAULT false,
  consent_display_identity BOOLEAN NOT NULL DEFAULT false,

  -- Notations (1-5, optionnelles)
  rating_overall INTEGER CHECK (rating_overall IS NULL OR (rating_overall >= 1 AND rating_overall <= 5)),
  rating_responsiveness INTEGER CHECK (rating_responsiveness IS NULL OR (rating_responsiveness >= 1 AND rating_responsiveness <= 5)),
  rating_quality INTEGER CHECK (rating_quality IS NULL OR (rating_quality >= 1 AND rating_quality <= 5)),
  rating_requirements INTEGER CHECK (rating_requirements IS NULL OR (rating_requirements >= 1 AND rating_requirements <= 5)),
  rating_communication INTEGER CHECK (rating_communication IS NULL OR (rating_communication >= 1 AND rating_communication <= 5)),
  rating_recommendation INTEGER CHECK (rating_recommendation IS NULL OR (rating_recommendation >= 1 AND rating_recommendation <= 5)),

  -- Commentaire
  comment TEXT NOT NULL,

  -- Score de fiabilité (calculé côté app)
  reliability_score INTEGER NOT NULL DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  reliability_level TEXT NOT NULL DEFAULT 'low' CHECK (reliability_level IN ('low', 'medium', 'high')),

  -- Publication (décision du freelance)
  is_published BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule review par email par request
  CONSTRAINT unique_review_per_email UNIQUE (review_request_id, reviewer_email)
);

-- Indexes
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_request ON reviews(review_request_id);
CREATE INDEX idx_reviews_invoice ON reviews(invoice_id);
CREATE INDEX idx_reviews_client ON reviews(client_id);
CREATE INDEX idx_reviews_published ON reviews(user_id, is_published);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reviews"
  ON reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. REVIEW MISSION MEDIA (Médias de contexte mission)
-- ============================================================================

CREATE TABLE review_mission_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_mission_media_invoice_order ON review_mission_media(invoice_id, sort_order);

-- RLS
ALTER TABLE review_mission_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mission media"
  ON review_mission_media
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. REVIEW DISPLAY PREFERENCES (Préférences d'affichage)
-- ============================================================================

CREATE TABLE review_display_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  show_ratings_mode TEXT NOT NULL DEFAULT 'all' CHECK (show_ratings_mode IN ('all', 'overall_only', 'none')),
  show_comment BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE review_display_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own display preferences"
  ON review_display_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. REVIEW COLLECTIONS (Collections de témoignages)
-- ============================================================================

CREATE TABLE review_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  public_token TEXT NOT NULL UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_review_collections_user ON review_collections(user_id);

-- RLS
ALTER TABLE review_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own review collections"
  ON review_collections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. REVIEW COLLECTION ITEMS (Items d'une collection)
-- ============================================================================

CREATE TABLE review_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES review_collections(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Une review unique par collection
  CONSTRAINT unique_review_in_collection UNIQUE (collection_id, review_id)
);

-- Index
CREATE INDEX idx_collection_items_collection_order ON review_collection_items(collection_id, sort_order);

-- RLS
ALTER TABLE review_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items in their collections"
  ON review_collection_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM review_collections
      WHERE review_collections.id = review_collection_items.collection_id
      AND review_collections.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_collections
      WHERE review_collections.id = review_collection_items.collection_id
      AND review_collections.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS pour updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_display_preferences_updated_at
  BEFORE UPDATE ON review_display_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_collections_updated_at
  BEFORE UPDATE ON review_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTION: Générer un token public unique
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_review_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE review_requests IS 'Demandes d''avis envoyées aux clients';
COMMENT ON TABLE review_request_recipients IS 'Destinataires des demandes d''avis';
COMMENT ON TABLE reviews IS 'Avis clients collectés';
COMMENT ON TABLE review_mission_media IS 'Médias (photos/vidéos) de contexte mission liés à une facture';
COMMENT ON TABLE review_display_preferences IS 'Préférences d''affichage des avis sur page publique';
COMMENT ON TABLE review_collections IS 'Collections/sélections de témoignages pour propositions';
COMMENT ON TABLE review_collection_items IS 'Items (reviews) dans une collection';

COMMENT ON CONSTRAINT unique_request_per_invoice ON review_requests IS 'Une seule demande principale par facture (v1)';
COMMENT ON CONSTRAINT unique_recipient_email ON review_request_recipients IS 'Un destinataire unique par email par request';
COMMENT ON CONSTRAINT unique_review_per_email ON reviews IS 'Une seule review par email par request';
COMMENT ON CONSTRAINT unique_review_in_collection ON review_collection_items IS 'Une review unique par collection';
