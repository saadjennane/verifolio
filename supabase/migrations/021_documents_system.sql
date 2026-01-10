-- Migration 021: Système Documents unifié
-- Documents = artefacts liés aux Deals et Missions (non des entités maîtresses)

-- Ajout des liens Deal/Mission sur les tables existantes

-- Quotes: ajouter deal_id (obligatoire pour envoyer un deal)
ALTER TABLE quotes
  ADD COLUMN deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

CREATE INDEX idx_quotes_deal_id ON quotes(deal_id);
CREATE INDEX idx_quotes_mission_id ON quotes(mission_id);

-- Invoices: ajouter mission_id (les factures sont liées aux missions)
ALTER TABLE invoices
  ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_mission_id ON invoices(mission_id);

-- Note: invoices.status doit devenir 'sent' au lieu de 'envoyee' pour cohérence
-- Mais on garde la compatibilité existante pour le moment

-- Proposals: déjà lié via client, pas de lien direct Deal/Mission nécessaire

-- Table delivery_notes (bons de livraison)
CREATE TABLE delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  numero TEXT NOT NULL,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Statut simple
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'envoye', 'signe')),

  notes TEXT,
  pdf_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un BL par mission par défaut (peut être étendu si besoin)
  CONSTRAINT unique_delivery_note_per_mission UNIQUE (mission_id)
);

CREATE INDEX idx_delivery_notes_user_id ON delivery_notes(user_id);
CREATE INDEX idx_delivery_notes_mission_id ON delivery_notes(mission_id);
CREATE INDEX idx_delivery_notes_client_id ON delivery_notes(client_id);

-- RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_notes_user_policy ON delivery_notes
  FOR ALL
  USING (auth.uid() = user_id);

-- Lignes de bons de livraison
CREATE TABLE delivery_note_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantite NUMERIC(10,2) NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'unité',
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_note_line_items_delivery_note_id ON delivery_note_line_items(delivery_note_id);

ALTER TABLE delivery_note_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_note_line_items_user_policy ON delivery_note_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = delivery_note_line_items.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

-- Trigger updated_at
CREATE TRIGGER delivery_notes_updated_at
  BEFORE UPDATE ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Historique des versions (approche simple)
-- On conserve l'historique via un champ version_number et parent_id

ALTER TABLE quotes
  ADD COLUMN version_number INTEGER DEFAULT 1,
  ADD COLUMN parent_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN version_number INTEGER DEFAULT 1,
  ADD COLUMN parent_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE delivery_notes
  ADD COLUMN version_number INTEGER DEFAULT 1,
  ADD COLUMN parent_delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE SET NULL;

-- Note: proposals a déjà un système de versions intégré via proposal_versions

-- Fonction helper pour vérifier qu'un deal a un devis avant SENT
CREATE OR REPLACE FUNCTION deal_has_quote(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_quote_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_quote_count
  FROM quotes
  WHERE deal_id = p_deal_id;

  RETURN v_quote_count > 0;
END;
$$ LANGUAGE plpgsql;
