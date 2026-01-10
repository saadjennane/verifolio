-- Migration: Delivery Notes (Bons de livraison)
-- Document généré avec numéro, désignation et statut

CREATE TABLE delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  delivery_note_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'CANCELLED')),
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for mission lookups
CREATE INDEX idx_delivery_notes_mission ON delivery_notes(mission_id);

-- Index for user lookups
CREATE INDEX idx_delivery_notes_user ON delivery_notes(user_id);

-- Index for status filtering
CREATE INDEX idx_delivery_notes_status ON delivery_notes(status);

-- Unique constraint on delivery note number per user
CREATE UNIQUE INDEX idx_delivery_notes_number_unique ON delivery_notes(user_id, delivery_note_number);

-- Enable RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own delivery notes"
  ON delivery_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own delivery notes"
  ON delivery_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own delivery notes"
  ON delivery_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own delivery notes"
  ON delivery_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Add next_delivery_note_number to companies for auto-increment
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_delivery_note_number INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS delivery_note_prefix TEXT DEFAULT 'BL-';

-- Trigger for updated_at
CREATE TRIGGER update_delivery_notes_updated_at
  BEFORE UPDATE ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE delivery_notes IS 'Bons de livraison (delivery notes) linked to missions';
COMMENT ON COLUMN delivery_notes.delivery_note_number IS 'Unique number like BL-001-25';
COMMENT ON COLUMN delivery_notes.title IS 'Description/designation of the delivery';
COMMENT ON COLUMN delivery_notes.status IS 'DRAFT, SENT, or CANCELLED';
