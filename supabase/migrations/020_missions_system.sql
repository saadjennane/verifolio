-- Migration 020: Système Missions
-- Cycle opérationnel : DEAL → MISSION → FACTURATION → REVIEWS

-- Table missions
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- Statuts exclusifs
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'delivered', 'to_invoice', 'invoiced', 'paid', 'closed', 'cancelled')
  ),

  -- Dates de transition
  started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  to_invoice_at TIMESTAMPTZ,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Visibilité Verifolio
  visible_on_verifolio BOOLEAN NOT NULL DEFAULT false,

  -- Montants
  estimated_amount NUMERIC(10, 2),
  final_amount NUMERIC(10, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule mission active par deal
  CONSTRAINT unique_mission_per_deal UNIQUE (deal_id)
);

-- Index
CREATE INDEX idx_missions_user_id ON missions(user_id);
CREATE INDEX idx_missions_deal_id ON missions(deal_id);
CREATE INDEX idx_missions_client_id ON missions(client_id);
CREATE INDEX idx_missions_status ON missions(status);

-- RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY missions_user_policy ON missions
  FOR ALL
  USING (auth.uid() = user_id);

-- Table mission_contacts (contacts liés à la mission)
CREATE TABLE mission_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_mission_contact UNIQUE (mission_id, contact_id)
);

CREATE INDEX idx_mission_contacts_mission_id ON mission_contacts(mission_id);
CREATE INDEX idx_mission_contacts_contact_id ON mission_contacts(contact_id);

ALTER TABLE mission_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_contacts_user_policy ON mission_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_contacts.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- Table mission_invoices (factures liées à la mission)
CREATE TABLE mission_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_mission_invoice UNIQUE (mission_id, invoice_id)
);

CREATE INDEX idx_mission_invoices_mission_id ON mission_invoices(mission_id);
CREATE INDEX idx_mission_invoices_invoice_id ON mission_invoices(invoice_id);

ALTER TABLE mission_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_invoices_user_policy ON mission_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_invoices.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- Table mission_tags
CREATE TABLE mission_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_mission_tag UNIQUE (mission_id, tag)
);

CREATE INDEX idx_mission_tags_mission_id ON mission_tags(mission_id);

ALTER TABLE mission_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_tags_user_policy ON mission_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_tags.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- Table mission_badges
CREATE TABLE mission_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_mission_badge UNIQUE (mission_id, badge)
);

CREATE INDEX idx_mission_badges_mission_id ON mission_badges(mission_id);

ALTER TABLE mission_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_badges_user_policy ON mission_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_badges.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- Trigger updated_at
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger pour auto-update des dates de statut
CREATE OR REPLACE FUNCTION update_mission_status_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    NEW.started_at = now();
  ELSIF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = now();
    -- Auto-transition vers TO_INVOICE
    NEW.status = 'to_invoice';
    NEW.to_invoice_at = now();
  ELSIF NEW.status = 'to_invoice' AND OLD.status != 'to_invoice' THEN
    NEW.to_invoice_at = now();
  ELSIF NEW.status = 'invoiced' AND OLD.status != 'invoiced' THEN
    NEW.invoiced_at = now();
  ELSIF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at = now();
  ELSIF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = now();
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_status_dates_trigger
  BEFORE UPDATE ON missions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_mission_status_dates();

-- Fonction pour calculer le statut INVOICED/PAID automatiquement
-- basé sur les factures liées
CREATE OR REPLACE FUNCTION update_mission_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_id UUID;
  v_invoice_count INT;
  v_sent_invoice_count INT;
  v_paid_invoice_count INT;
  v_current_status TEXT;
BEGIN
  -- Récupérer la mission liée
  IF TG_OP = 'DELETE' THEN
    v_mission_id = OLD.mission_id;
  ELSE
    v_mission_id = NEW.mission_id;
  END IF;

  -- Compter les factures
  SELECT COUNT(*) INTO v_invoice_count
  FROM mission_invoices mi
  JOIN invoices i ON i.id = mi.invoice_id
  WHERE mi.mission_id = v_mission_id;

  SELECT COUNT(*) INTO v_sent_invoice_count
  FROM mission_invoices mi
  JOIN invoices i ON i.id = mi.invoice_id
  WHERE mi.mission_id = v_mission_id
  AND i.status = 'sent';

  SELECT COUNT(*) INTO v_paid_invoice_count
  FROM mission_invoices mi
  JOIN invoices i ON i.id = mi.invoice_id
  WHERE mi.mission_id = v_mission_id
  AND i.status = 'paid';

  SELECT status INTO v_current_status
  FROM missions
  WHERE id = v_mission_id;

  -- Logique de transition
  IF v_sent_invoice_count > 0 AND v_current_status = 'to_invoice' THEN
    UPDATE missions SET status = 'invoiced' WHERE id = v_mission_id;
  ELSIF v_invoice_count > 0 AND v_paid_invoice_count = v_invoice_count AND v_current_status = 'invoiced' THEN
    UPDATE missions SET status = 'paid' WHERE id = v_mission_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_invoice_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON mission_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_invoice_status();

-- Mise à jour de la table deals pour ajouter la FK mission_id
-- (déjà présente dans migration 019, mais on l'ajoute maintenant)
ALTER TABLE deals
  DROP CONSTRAINT IF EXISTS deals_mission_id_fkey;

ALTER TABLE deals
  ADD CONSTRAINT deals_mission_id_fkey
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE SET NULL;
