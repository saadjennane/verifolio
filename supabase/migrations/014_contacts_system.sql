-- Verifolio - Contacts System
-- Migration: 014_contacts_system.sql

-- ============================================================================
-- Table: contacts (independent contacts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_nom ON contacts(user_id, nom);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- ============================================================================
-- Table: client_contacts (junction table with relationship metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT,                                      -- Job title/function (e.g., "Directeur Commercial", "Comptable")
  handles_billing BOOLEAN NOT NULL DEFAULT FALSE, -- Handles invoicing/payment matters
  handles_ops BOOLEAN NOT NULL DEFAULT FALSE,     -- Handles operational matters
  handles_management BOOLEAN NOT NULL DEFAULT FALSE, -- Handles direction/validation
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,      -- Primary contact for this client
  preferred_channel TEXT CHECK (preferred_channel IN ('email', 'phone')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_contacts_unique UNIQUE (client_id, contact_id)
);

-- Indexes for client_contacts
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_contact ON client_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_billing ON client_contacts(client_id) WHERE handles_billing = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_contacts_ops ON client_contacts(client_id) WHERE handles_ops = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_contacts_management ON client_contacts(client_id) WHERE handles_management = TRUE;

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS client_contacts_updated_at ON client_contacts;
CREATE TRIGGER client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (permissive for dev, matching existing pattern)
-- ============================================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_all" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "client_contacts_all" ON client_contacts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- View for convenient querying
-- ============================================================================
CREATE OR REPLACE VIEW client_contacts_view AS
SELECT
  cc.id,
  cc.client_id,
  cc.contact_id,
  c.nom AS contact_nom,
  c.email AS contact_email,
  c.telephone AS contact_telephone,
  cc.role,
  cc.handles_billing,
  cc.handles_ops,
  cc.handles_management,
  cc.is_primary,
  cc.preferred_channel,
  cl.nom AS client_nom
FROM client_contacts cc
JOIN contacts c ON c.id = cc.contact_id
JOIN clients cl ON cl.id = cc.client_id;
