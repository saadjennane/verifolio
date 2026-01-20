-- ============================================================================
-- Migration 085: Payments System
-- Permet d'enregistrer des paiements sur factures, avances client, remboursements
-- ============================================================================

-- Table payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Liens optionnels (au moins client_id OU invoice_id requis)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,

  -- Montant (positif = paiement/avance, négatif = remboursement)
  amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Mode de paiement
  payment_method TEXT NOT NULL DEFAULT 'virement' CHECK (payment_method IN (
    'virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre'
  )),

  -- Type de paiement
  payment_type TEXT NOT NULL DEFAULT 'payment' CHECK (payment_type IN (
    'payment',    -- Paiement sur facture
    'advance',    -- Avance client (sans facture)
    'refund'      -- Remboursement
  )),

  reference TEXT,   -- N° chèque, ref virement, etc.
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte : au moins client_id ou invoice_id doit être renseigné
  CONSTRAINT payment_has_target CHECK (client_id IS NOT NULL OR invoice_id IS NOT NULL)
);

-- Index pour performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_mission_id ON payments(mission_id);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

-- Trigger updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Politique: utilisateur voit/modifie ses propres paiements
CREATE POLICY payments_user_policy ON payments
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- Vue: Résumé paiements par facture
-- ============================================================================

CREATE OR REPLACE VIEW invoice_payment_summary AS
SELECT
  i.id,
  i.user_id,
  i.numero,
  i.client_id,
  i.total_ttc,
  i.status,
  i.date_emission,
  i.date_echeance,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type != 'refund'), 0) AS total_paid,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'refund'), 0) AS total_refunded,
  i.total_ttc - COALESCE(SUM(p.amount), 0) AS remaining,
  CASE
    WHEN COALESCE(SUM(p.amount), 0) <= 0 THEN 'non_paye'
    WHEN COALESCE(SUM(p.amount), 0) >= i.total_ttc THEN 'paye'
    ELSE 'partiel'
  END AS payment_status,
  COUNT(p.id) AS payment_count
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id;

-- ============================================================================
-- Vue: Solde client (factures + avances)
-- ============================================================================

CREATE OR REPLACE VIEW client_payment_balance AS
SELECT
  c.id AS client_id,
  c.user_id,
  c.nom,
  -- Total facturé (factures non annulées)
  COALESCE(SUM(i.total_ttc) FILTER (WHERE i.status != 'annulee'), 0) AS total_invoiced,
  -- Paiements sur factures
  COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.client_id = c.id
    AND p.invoice_id IS NOT NULL
    AND p.payment_type = 'payment'
  ), 0) AS total_paid_invoices,
  -- Avances (sans facture)
  COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.client_id = c.id
    AND p.invoice_id IS NULL
    AND p.payment_type = 'advance'
  ), 0) AS total_advances,
  -- Remboursements
  COALESCE((
    SELECT SUM(ABS(p.amount))
    FROM payments p
    WHERE p.client_id = c.id
    AND p.payment_type = 'refund'
  ), 0) AS total_refunds,
  -- Solde = facturé - payé sur factures - avances + remboursements
  COALESCE(SUM(i.total_ttc) FILTER (WHERE i.status != 'annulee'), 0)
  - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.client_id = c.id AND p.invoice_id IS NOT NULL AND p.payment_type = 'payment'), 0)
  - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.client_id = c.id AND p.invoice_id IS NULL AND p.payment_type = 'advance'), 0)
  + COALESCE((SELECT SUM(ABS(p.amount)) FROM payments p WHERE p.client_id = c.id AND p.payment_type = 'refund'), 0)
  AS balance
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id
GROUP BY c.id, c.user_id, c.nom;

-- ============================================================================
-- Vue: Résumé paiements par mission
-- ============================================================================

CREATE OR REPLACE VIEW mission_payment_summary AS
SELECT
  m.id AS mission_id,
  m.user_id,
  m.title,
  m.client_id,
  m.status AS mission_status,
  -- Total facturé via mission_invoices
  COALESCE(SUM(i.total_ttc), 0) AS total_invoiced,
  -- Total payé sur ces factures
  COALESCE(SUM(ips.total_paid), 0) AS total_paid,
  -- Avances liées directement à la mission
  COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.mission_id = m.id
    AND p.invoice_id IS NULL
    AND p.payment_type = 'advance'
  ), 0) AS total_advances,
  -- Reste à payer
  COALESCE(SUM(i.total_ttc), 0) - COALESCE(SUM(ips.total_paid), 0) AS remaining
FROM missions m
LEFT JOIN mission_invoices mi ON mi.mission_id = m.id
LEFT JOIN invoices i ON i.id = mi.invoice_id AND i.status != 'annulee'
LEFT JOIN invoice_payment_summary ips ON ips.id = i.id
GROUP BY m.id, m.user_id, m.title, m.client_id, m.status;

-- ============================================================================
-- Trigger: Auto-populate client_id from invoice if not provided
-- ============================================================================

CREATE OR REPLACE FUNCTION set_payment_client_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Si invoice_id est fourni mais pas client_id, récupérer le client de la facture
  IF NEW.invoice_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM invoices
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_set_client_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_client_from_invoice();

-- ============================================================================
-- Trigger: Update mission status when all invoices are paid
-- ============================================================================

CREATE OR REPLACE FUNCTION check_mission_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_id UUID;
  v_unpaid_count INT;
BEGIN
  -- Trouver la mission liée à cette facture
  SELECT mi.mission_id INTO v_mission_id
  FROM mission_invoices mi
  WHERE mi.invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF v_mission_id IS NOT NULL THEN
    -- Compter les factures non entièrement payées
    SELECT COUNT(*) INTO v_unpaid_count
    FROM mission_invoices mi
    JOIN invoice_payment_summary ips ON ips.id = mi.invoice_id
    WHERE mi.mission_id = v_mission_id
    AND ips.remaining > 0;

    -- Si toutes les factures sont payées, passer la mission à 'paid'
    IF v_unpaid_count = 0 THEN
      UPDATE missions
      SET status = 'paid', paid_at = NOW()
      WHERE id = v_mission_id
      AND status = 'invoiced';
    -- Si un paiement est supprimé/modifié et qu'il reste du solde, revenir à 'invoiced'
    ELSIF TG_OP IN ('DELETE', 'UPDATE') THEN
      UPDATE missions
      SET status = 'invoiced', paid_at = NULL
      WHERE id = v_mission_id
      AND status = 'paid';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_check_mission_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION check_mission_payment_status();
