-- ============================================================================
-- Migration 083: Add is_client flag to clients table
-- ============================================================================
-- Allows entities to be client only, supplier only, or both

-- Add is_client flag (default true for backward compatibility)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_client BOOLEAN NOT NULL DEFAULT true;

-- Index for client queries
CREATE INDEX IF NOT EXISTS idx_clients_is_client
  ON clients(user_id, is_client) WHERE deleted_at IS NULL AND is_client = true;

-- Update comment
COMMENT ON COLUMN clients.is_client IS 'True if this entity is a client (can receive quotes/invoices from user)';
