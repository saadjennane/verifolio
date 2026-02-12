-- ============================================================================
-- Migration: Add logo support to clients table
-- ============================================================================

-- Add logo columns to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_source TEXT CHECK (logo_source IN ('upload', 'logodev')),
ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMPTZ;

-- Create index for faster logo queries
CREATE INDEX IF NOT EXISTS idx_clients_logo_url ON clients(logo_url) WHERE logo_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN clients.logo_url IS 'URL of the client logo (either internal storage or external from logo.dev)';
COMMENT ON COLUMN clients.logo_source IS 'Source of the logo: upload (manual upload) or logodev (logo.dev API)';
COMMENT ON COLUMN clients.logo_updated_at IS 'Timestamp when the logo was last updated';
