-- Migration 068: Activity Logs
-- Tracks all CRUD operations on entities for activity history

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What happened
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),

  -- What entity was affected
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'client', 'contact', 'deal', 'mission',
    'quote', 'invoice', 'proposal', 'brief', 'review_request'
  )),
  entity_id UUID NOT NULL,
  entity_title TEXT NOT NULL,

  -- Source tracking: manual = user action, assistant = AI-triggered action
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'assistant')),

  -- Optional details for updates
  changes JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing user's activities (most recent first)
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

-- Index for looking up activities for a specific entity
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE activity_logs IS 'Tracks all CRUD operations on entities for activity history';
COMMENT ON COLUMN activity_logs.source IS 'manual = user action, assistant = AI-triggered action';
COMMENT ON COLUMN activity_logs.entity_title IS 'Snapshot of entity title at time of action for display';
