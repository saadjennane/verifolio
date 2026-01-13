-- ============================================================================
-- Migration 073: Make deal_id and client_id nullable in proposals
-- Allows creating template drafts without a deal or client
-- ============================================================================

-- Remove NOT NULL constraint from deal_id
ALTER TABLE proposals
  ALTER COLUMN deal_id DROP NOT NULL;

-- Remove NOT NULL constraint from client_id
ALTER TABLE proposals
  ALTER COLUMN client_id DROP NOT NULL;

-- Update FK constraints to handle null values properly
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_deal_id_fkey;

ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_client_id_fkey;

-- Re-add constraints with ON DELETE SET NULL
ALTER TABLE proposals
  ADD CONSTRAINT proposals_deal_id_fkey
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

COMMENT ON COLUMN proposals.deal_id IS 'Deal associé (NULL pour les brouillons de templates)';
COMMENT ON COLUMN proposals.client_id IS 'Client associé (NULL pour les brouillons de templates)';
