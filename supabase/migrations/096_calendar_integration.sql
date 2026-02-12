-- Migration 096: Google Calendar Integration
-- Links Google Calendar events to Verifolio entities for enrichment

-- ============================================================================
-- CALENDAR_EVENT_LINKS TABLE
-- ============================================================================
-- Verifolio ne stocke PAS les événements, seulement les liens vers Google
-- Cette table permet d'enrichir les événements Google avec des entités métier

CREATE TABLE calendar_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Google Calendar reference
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',

  -- Cached event metadata (for quick display without API call)
  event_title TEXT,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,

  -- Entity links (all nullable - an event can be linked to multiple entities)
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate links for same Google event
  CONSTRAINT unique_google_event_link UNIQUE (user_id, google_event_id)
);

-- ============================================================================
-- GOOGLE_CALENDAR_TOKENS TABLE
-- ============================================================================
-- Stores OAuth tokens for Google Calendar API access
-- Separate from Supabase auth which only handles login

CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_calendar_token UNIQUE (user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_calendar_links_user ON calendar_event_links(user_id);
CREATE INDEX idx_calendar_links_google_event ON calendar_event_links(google_event_id);
CREATE INDEX idx_calendar_links_event_start ON calendar_event_links(event_start);
CREATE INDEX idx_calendar_links_mission ON calendar_event_links(mission_id) WHERE mission_id IS NOT NULL;
CREATE INDEX idx_calendar_links_deal ON calendar_event_links(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_calendar_links_client ON calendar_event_links(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_calendar_links_contact ON calendar_event_links(contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX idx_calendar_tokens_user ON google_calendar_tokens(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_calendar_links_updated_at
  BEFORE UPDATE ON calendar_event_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE calendar_event_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_links_owner ON calendar_event_links
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY calendar_tokens_owner ON google_calendar_tokens
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE calendar_event_links IS 'Links Google Calendar events to Verifolio entities';
COMMENT ON TABLE google_calendar_tokens IS 'OAuth tokens for Google Calendar API';
COMMENT ON COLUMN calendar_event_links.google_event_id IS 'Event ID from Google Calendar API';
COMMENT ON COLUMN calendar_event_links.event_title IS 'Cached title for quick display';
COMMENT ON COLUMN calendar_event_links.supplier_id IS 'References clients table (suppliers are also in clients)';
