-- Migration: Add handles_commercial to client_contacts
-- This adds a new responsibility type for commercial/sales contacts

ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS handles_commercial BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup of commercial contacts per client
CREATE INDEX IF NOT EXISTS idx_client_contacts_commercial ON client_contacts(client_id) WHERE handles_commercial = true;
