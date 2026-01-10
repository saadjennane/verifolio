-- Migration: Entity Documents (attachments for Deals and Missions)
-- Allows uploading files (PDF/DOC/DOCX) and linking them to deals or missions

-- Create the documents table with polymorphic entity reference
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('DEAL', 'MISSION')),
  entity_id UUID NOT NULL,
  doc_kind TEXT NOT NULL CHECK (doc_kind IN ('PO', 'DELIVERY_NOTE')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user and entity
CREATE INDEX idx_documents_user_entity ON documents(user_id, entity_type, entity_id);

-- Index for filtering by document kind
CREATE INDEX idx_documents_doc_kind ON documents(doc_kind);

-- Index for entity lookups (useful for foreign key-like queries)
CREATE INDEX idx_documents_entity_id ON documents(entity_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own documents
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE documents IS 'Attached documents (PO, delivery notes) linked to deals or missions';
COMMENT ON COLUMN documents.entity_type IS 'Type of parent entity: DEAL or MISSION';
COMMENT ON COLUMN documents.entity_id IS 'UUID of the parent deal or mission';
COMMENT ON COLUMN documents.doc_kind IS 'Document type: PO (Purchase Order), DELIVERY_NOTE';
COMMENT ON COLUMN documents.storage_path IS 'Path in Supabase storage bucket (source of truth)';
