-- Migration 094: Notes System Schema
-- Core note-taking module with polymorphic entity linking

-- ============================================================================
-- NOTES TABLE
-- ============================================================================

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sans titre',
  content TEXT NOT NULL DEFAULT '',
  content_json JSONB DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  color TEXT DEFAULT 'gray',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- NOTE_LINKS TABLE (Polymorphic linking)
-- ============================================================================

CREATE TABLE note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'deal', 'mission', 'proposal', 'brief', 'client', 'contact',
    'invoice', 'quote', 'review', 'task', 'supplier'
  )),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_note_entity_link UNIQUE (note_id, entity_type, entity_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_pinned ON notes(pinned) WHERE pinned = true;
CREATE INDEX idx_notes_deleted ON notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

CREATE INDEX idx_note_links_note ON note_links(note_id);
CREATE INDEX idx_note_links_entity ON note_links(entity_type, entity_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_owner ON notes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY note_links_owner ON note_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_links.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notes IS 'User notes with TipTap rich text editor';
COMMENT ON TABLE note_links IS 'Polymorphic linking of notes to entities';
COMMENT ON COLUMN note_links.entity_type IS 'Type: deal, mission, client, etc.';
