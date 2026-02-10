-- ============================================================================
-- Migration 088: Treasury Module
-- Etend le systeme de paiements pour les factures fournisseurs
-- Cree des vues unifiees pour la tresorerie
-- ============================================================================

-- ============================================================================
-- 1. Ajouter colonnes pour paiements fournisseurs
-- ============================================================================

ALTER TABLE payments
  ADD COLUMN supplier_invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN supplier_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Index pour performance
CREATE INDEX idx_payments_supplier_invoice_id ON payments(supplier_invoice_id);
CREATE INDEX idx_payments_supplier_id ON payments(supplier_id);

-- ============================================================================
-- 2. Modifier les contraintes
-- ============================================================================

-- Supprimer l'ancienne contrainte payment_has_target
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payment_has_target;

-- Nouvelle contrainte: au moins une cible (client, invoice, supplier, ou supplier_invoice)
ALTER TABLE payments ADD CONSTRAINT payment_has_target
  CHECK (
    client_id IS NOT NULL
    OR invoice_id IS NOT NULL
    OR supplier_id IS NOT NULL
    OR supplier_invoice_id IS NOT NULL
  );

-- Supprimer l'ancienne contrainte payment_type
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Nouvelle contrainte payment_type avec types fournisseur
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN (
    'payment',           -- Paiement client sur facture (IN)
    'advance',           -- Avance client (IN)
    'refund',            -- Remboursement client (OUT)
    'supplier_payment',  -- Paiement fournisseur (OUT)
    'supplier_advance',  -- Avance fournisseur (OUT)
    'supplier_refund'    -- Remboursement fournisseur (IN)
  ));

-- ============================================================================
-- 3. Vue: Resume paiements par facture fournisseur
-- ============================================================================

CREATE OR REPLACE VIEW supplier_invoice_payment_summary AS
SELECT
  si.id,
  si.user_id,
  si.numero,
  si.supplier_id,
  c.nom AS supplier_name,
  si.total_ttc,
  si.status,
  si.date_facture,
  si.date_echeance,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type IN ('supplier_payment', 'supplier_advance')), 0) AS total_paid,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'supplier_refund'), 0) AS total_refunded,
  COALESCE(si.total_ttc, 0)
    - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type IN ('supplier_payment', 'supplier_advance')), 0)
    + COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'supplier_refund'), 0) AS remaining,
  CASE
    WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type IN ('supplier_payment', 'supplier_advance')), 0) <= 0 THEN 'non_paye'
    WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type IN ('supplier_payment', 'supplier_advance')), 0) >= COALESCE(si.total_ttc, 0) THEN 'paye'
    ELSE 'partiel'
  END AS payment_status,
  COUNT(p.id) AS payment_count
FROM supplier_invoices si
LEFT JOIN clients c ON c.id = si.supplier_id
LEFT JOIN payments p ON p.supplier_invoice_id = si.id
WHERE si.deleted_at IS NULL
GROUP BY si.id, c.nom;

-- ============================================================================
-- 4. Vue: Mouvements de tresorerie unifies
-- ============================================================================

CREATE OR REPLACE VIEW treasury_movements AS
-- Paiements clients (encaissements)
SELECT
  p.id,
  p.user_id,
  p.payment_date AS date,
  p.amount,
  p.payment_method,
  p.payment_type,
  p.reference,
  p.notes,
  'in'::TEXT AS direction,
  'client_payment'::TEXT AS movement_type,
  p.invoice_id,
  NULL::UUID AS supplier_invoice_id,
  p.client_id AS counterpart_id,
  c.nom AS counterpart_name,
  i.numero AS document_numero,
  'invoice'::TEXT AS document_type,
  i.mission_id,
  p.created_at
FROM payments p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.payment_type IN ('payment', 'advance')
  AND p.supplier_invoice_id IS NULL
  AND p.supplier_id IS NULL

UNION ALL

-- Remboursements clients (decaissements)
SELECT
  p.id,
  p.user_id,
  p.payment_date AS date,
  ABS(p.amount) AS amount,
  p.payment_method,
  p.payment_type,
  p.reference,
  p.notes,
  'out'::TEXT AS direction,
  'client_refund'::TEXT AS movement_type,
  p.invoice_id,
  NULL::UUID AS supplier_invoice_id,
  p.client_id AS counterpart_id,
  c.nom AS counterpart_name,
  i.numero AS document_numero,
  'invoice'::TEXT AS document_type,
  i.mission_id,
  p.created_at
FROM payments p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.payment_type = 'refund'
  AND p.supplier_invoice_id IS NULL
  AND p.supplier_id IS NULL

UNION ALL

-- Paiements fournisseurs (decaissements)
SELECT
  p.id,
  p.user_id,
  p.payment_date AS date,
  p.amount,
  p.payment_method,
  p.payment_type,
  p.reference,
  p.notes,
  'out'::TEXT AS direction,
  'supplier_payment'::TEXT AS movement_type,
  NULL::UUID AS invoice_id,
  p.supplier_invoice_id,
  COALESCE(p.supplier_id, si.supplier_id) AS counterpart_id,
  s.nom AS counterpart_name,
  si.numero AS document_numero,
  'supplier_invoice'::TEXT AS document_type,
  NULL::UUID AS mission_id,
  p.created_at
FROM payments p
LEFT JOIN supplier_invoices si ON si.id = p.supplier_invoice_id
LEFT JOIN clients s ON s.id = COALESCE(p.supplier_id, si.supplier_id)
WHERE p.payment_type IN ('supplier_payment', 'supplier_advance')

UNION ALL

-- Remboursements fournisseurs (encaissements)
SELECT
  p.id,
  p.user_id,
  p.payment_date AS date,
  p.amount,
  p.payment_method,
  p.payment_type,
  p.reference,
  p.notes,
  'in'::TEXT AS direction,
  'supplier_refund'::TEXT AS movement_type,
  NULL::UUID AS invoice_id,
  p.supplier_invoice_id,
  COALESCE(p.supplier_id, si.supplier_id) AS counterpart_id,
  s.nom AS counterpart_name,
  si.numero AS document_numero,
  'supplier_invoice'::TEXT AS document_type,
  NULL::UUID AS mission_id,
  p.created_at
FROM payments p
LEFT JOIN supplier_invoices si ON si.id = p.supplier_invoice_id
LEFT JOIN clients s ON s.id = COALESCE(p.supplier_id, si.supplier_id)
WHERE p.payment_type = 'supplier_refund';

-- ============================================================================
-- 5. Fonction: Calcul des KPIs de tresorerie
-- ============================================================================

CREATE OR REPLACE FUNCTION get_treasury_kpis(
  p_user_id UUID,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
) RETURNS TABLE (
  total_encaisse DECIMAL(12,2),
  total_decaisse DECIMAL(12,2),
  solde_net DECIMAL(12,2),
  a_encaisser DECIMAL(12,2),
  a_payer DECIMAL(12,2),
  en_retard_encaissement DECIMAL(12,2),
  en_retard_paiement DECIMAL(12,2),
  a_venir_encaissement DECIMAL(12,2),
  a_venir_paiement DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total encaisse (IN) pour la periode
    COALESCE((
      SELECT SUM(tm.amount)
      FROM treasury_movements tm
      WHERE tm.user_id = p_user_id
        AND tm.direction = 'in'
        AND (p_from_date IS NULL OR tm.date >= p_from_date)
        AND (p_to_date IS NULL OR tm.date <= p_to_date)
    ), 0)::DECIMAL(12,2) AS total_encaisse,

    -- Total decaisse (OUT) pour la periode
    COALESCE((
      SELECT SUM(tm.amount)
      FROM treasury_movements tm
      WHERE tm.user_id = p_user_id
        AND tm.direction = 'out'
        AND (p_from_date IS NULL OR tm.date >= p_from_date)
        AND (p_to_date IS NULL OR tm.date <= p_to_date)
    ), 0)::DECIMAL(12,2) AS total_decaisse,

    -- Solde net = IN - OUT
    (COALESCE((
      SELECT SUM(CASE WHEN tm.direction = 'in' THEN tm.amount ELSE -tm.amount END)
      FROM treasury_movements tm
      WHERE tm.user_id = p_user_id
        AND (p_from_date IS NULL OR tm.date >= p_from_date)
        AND (p_to_date IS NULL OR tm.date <= p_to_date)
    ), 0))::DECIMAL(12,2) AS solde_net,

    -- A encaisser (factures clients non payees, hors brouillon/annulee)
    COALESCE((
      SELECT SUM(ips.remaining)
      FROM invoice_payment_summary ips
      WHERE ips.user_id = p_user_id
        AND ips.payment_status != 'paye'
        AND ips.status NOT IN ('brouillon', 'annulee')
    ), 0)::DECIMAL(12,2) AS a_encaisser,

    -- A payer (factures fournisseurs non payees)
    COALESCE((
      SELECT SUM(sips.remaining)
      FROM supplier_invoice_payment_summary sips
      WHERE sips.user_id = p_user_id
        AND sips.payment_status != 'paye'
        AND sips.status NOT IN ('cancelled')
    ), 0)::DECIMAL(12,2) AS a_payer,

    -- En retard encaissement (factures clients echues non payees)
    COALESCE((
      SELECT SUM(ips.remaining)
      FROM invoice_payment_summary ips
      WHERE ips.user_id = p_user_id
        AND ips.payment_status != 'paye'
        AND ips.status = 'envoyee'
        AND ips.date_echeance < CURRENT_DATE
    ), 0)::DECIMAL(12,2) AS en_retard_encaissement,

    -- En retard paiement (factures fournisseurs echues non payees)
    COALESCE((
      SELECT SUM(sips.remaining)
      FROM supplier_invoice_payment_summary sips
      WHERE sips.user_id = p_user_id
        AND sips.payment_status != 'paye'
        AND sips.status NOT IN ('cancelled')
        AND sips.date_echeance IS NOT NULL
        AND sips.date_echeance < CURRENT_DATE
    ), 0)::DECIMAL(12,2) AS en_retard_paiement,

    -- A venir encaissement (factures clients non echues)
    COALESCE((
      SELECT SUM(ips.remaining)
      FROM invoice_payment_summary ips
      WHERE ips.user_id = p_user_id
        AND ips.payment_status != 'paye'
        AND ips.status = 'envoyee'
        AND (ips.date_echeance IS NULL OR ips.date_echeance >= CURRENT_DATE)
    ), 0)::DECIMAL(12,2) AS a_venir_encaissement,

    -- A venir paiement (factures fournisseurs non echues)
    COALESCE((
      SELECT SUM(sips.remaining)
      FROM supplier_invoice_payment_summary sips
      WHERE sips.user_id = p_user_id
        AND sips.payment_status != 'paye'
        AND sips.status NOT IN ('cancelled')
        AND (sips.date_echeance IS NULL OR sips.date_echeance >= CURRENT_DATE)
    ), 0)::DECIMAL(12,2) AS a_venir_paiement;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. Trigger: Auto-populate supplier_id from supplier_invoice
-- ============================================================================

CREATE OR REPLACE FUNCTION set_payment_supplier_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Si supplier_invoice_id est fourni mais pas supplier_id, recuperer le fournisseur
  IF NEW.supplier_invoice_id IS NOT NULL AND NEW.supplier_id IS NULL THEN
    SELECT supplier_id INTO NEW.supplier_id
    FROM supplier_invoices
    WHERE id = NEW.supplier_invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_set_supplier_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_supplier_from_invoice();

-- ============================================================================
-- 7. Trigger: Update supplier invoice status when fully paid
-- ============================================================================

CREATE OR REPLACE FUNCTION update_supplier_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_invoice_id UUID;
  v_total_paid DECIMAL(12,2);
  v_total_ttc DECIMAL(12,2);
BEGIN
  v_supplier_invoice_id := COALESCE(NEW.supplier_invoice_id, OLD.supplier_invoice_id);

  IF v_supplier_invoice_id IS NOT NULL THEN
    -- Calculer le total paye
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE payment_type IN ('supplier_payment', 'supplier_advance')), 0)
        - COALESCE(SUM(amount) FILTER (WHERE payment_type = 'supplier_refund'), 0),
      si.total_ttc
    INTO v_total_paid, v_total_ttc
    FROM supplier_invoices si
    LEFT JOIN payments p ON p.supplier_invoice_id = si.id
    WHERE si.id = v_supplier_invoice_id
    GROUP BY si.id, si.total_ttc;

    -- Mettre a jour le statut
    IF v_total_paid >= COALESCE(v_total_ttc, 0) THEN
      UPDATE supplier_invoices
      SET status = 'paid', paid_at = NOW()
      WHERE id = v_supplier_invoice_id
        AND status != 'paid';
    ELSE
      UPDATE supplier_invoices
      SET status = 'pending', paid_at = NULL
      WHERE id = v_supplier_invoice_id
        AND status = 'paid';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_supplier_invoice_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_invoice_payment_status();

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON VIEW treasury_movements IS 'Vue unifiee de tous les mouvements de tresorerie (encaissements et decaissements)';
COMMENT ON VIEW supplier_invoice_payment_summary IS 'Resume des paiements par facture fournisseur';
COMMENT ON FUNCTION get_treasury_kpis IS 'Calcule les KPIs de tresorerie pour une periode donnee';
