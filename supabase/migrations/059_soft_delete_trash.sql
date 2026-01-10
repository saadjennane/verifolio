-- ============================================================================
-- Migration 059: Soft Delete & Trash System
-- ============================================================================
-- Adds deleted_at column to main entity tables for trash/restore functionality
-- Items are kept for 30 days before permanent deletion

-- Add deleted_at to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to missions
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to quotes
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to proposals
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- Indexes for performance (partial indexes on deleted items only)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at
  ON clients(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at
  ON contacts(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_deleted_at
  ON deals(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_deleted_at
  ON missions(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at
  ON quotes(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at
  ON invoices(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_deleted_at
  ON proposals(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN clients.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
COMMENT ON COLUMN contacts.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
COMMENT ON COLUMN deals.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
COMMENT ON COLUMN missions.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
COMMENT ON COLUMN quotes.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
COMMENT ON COLUMN invoices.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
COMMENT ON COLUMN proposals.deleted_at IS 'Soft delete timestamp. Items with this set are in trash.';
