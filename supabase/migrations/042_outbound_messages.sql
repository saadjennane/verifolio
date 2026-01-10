-- Migration: Outbound Messages System
-- Description: Log des envois de documents (devis, factures, propositions, review requests)

-- ============================================================================
-- OUTBOUND_MESSAGES TABLE
-- ============================================================================

CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contexte de l'envoi (deal ou mission)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('deal', 'mission', 'client')),
  entity_id UUID NOT NULL,

  -- Type et référence du document
  doc_type TEXT NOT NULL CHECK (doc_type IN ('quote', 'invoice', 'proposal', 'review_request')),
  document_id UUID, -- Peut être null pour review_request sans document formel

  -- Destinataires
  recipient_contact_ids UUID[] NOT NULL DEFAULT '{}',
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',

  -- Statut de l'envoi
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,

  -- Métadonnées
  subject TEXT,
  message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_outbound_messages_user ON outbound_messages(user_id);
CREATE INDEX idx_outbound_messages_entity ON outbound_messages(entity_type, entity_id);
CREATE INDEX idx_outbound_messages_document ON outbound_messages(doc_type, document_id);
CREATE INDEX idx_outbound_messages_status ON outbound_messages(status);
CREATE INDEX idx_outbound_messages_created ON outbound_messages(created_at DESC);

-- RLS
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own outbound messages"
  ON outbound_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE outbound_messages IS 'Log des envois de documents aux contacts';
COMMENT ON COLUMN outbound_messages.entity_type IS 'Contexte: deal, mission, ou client direct';
COMMENT ON COLUMN outbound_messages.doc_type IS 'Type: quote, invoice, proposal, review_request';
COMMENT ON COLUMN outbound_messages.recipient_contact_ids IS 'IDs des contacts destinataires';
COMMENT ON COLUMN outbound_messages.recipient_emails IS 'Emails des destinataires au moment de l envoi';
