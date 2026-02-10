-- ============================================================================
-- Migration 090: Unassociated Payments Enhancement
-- Permet de creer des paiements independants et de les associer a posteriori
-- ============================================================================

-- ============================================================================
-- 1. Ajouter deal_id aux paiements (pour decaissements fournisseurs)
-- ============================================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deal_id ON payments(deal_id);

-- ============================================================================
-- 2. Vue: Paiements non associes a une facture (pour encaissements)
-- ============================================================================

CREATE OR REPLACE VIEW unassociated_client_payments AS
SELECT
  p.id,
  p.user_id,
  p.client_id,
  c.nom AS client_name,
  p.mission_id,
  m.title AS mission_title,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.payment_type,
  p.reference,
  p.notes,
  p.created_at,
  -- Montant deja affecte a des factures (si paiement partiel)
  0::DECIMAL AS allocated_amount,
  -- Montant disponible pour affectation
  p.amount AS available_amount
FROM payments p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN missions m ON m.id = p.mission_id
WHERE p.invoice_id IS NULL
AND p.supplier_id IS NULL
AND p.supplier_invoice_id IS NULL
AND p.subscription_id IS NULL
AND p.payment_type IN ('payment', 'advance')
AND p.amount > 0;

-- ============================================================================
-- 3. Vue: Paiements fournisseur non associes a une facture
-- ============================================================================

CREATE OR REPLACE VIEW unassociated_supplier_payments AS
SELECT
  p.id,
  p.user_id,
  p.supplier_id,
  c.nom AS supplier_name,
  p.mission_id,
  m.title AS mission_title,
  p.deal_id,
  d.title AS deal_name,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.payment_type,
  p.reference,
  p.notes,
  p.created_at,
  0::DECIMAL AS allocated_amount,
  p.amount AS available_amount
FROM payments p
LEFT JOIN clients c ON c.id = p.supplier_id
LEFT JOIN missions m ON m.id = p.mission_id
LEFT JOIN deals d ON d.id = p.deal_id
WHERE p.supplier_invoice_id IS NULL
AND p.invoice_id IS NULL
AND p.subscription_id IS NULL
AND p.payment_type IN ('supplier_payment', 'supplier_advance')
AND p.amount > 0;

-- ============================================================================
-- 4. Vue: Factures client en attente de paiement (pour association)
-- ============================================================================

CREATE OR REPLACE VIEW pending_client_invoices AS
SELECT
  i.id,
  i.user_id,
  i.numero,
  i.client_id,
  c.nom AS client_name,
  i.date_emission,
  i.date_echeance,
  i.total_ttc,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'payment'), 0) AS total_paid,
  i.total_ttc - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'payment'), 0) AS remaining,
  i.status
FROM invoices i
LEFT JOIN clients c ON c.id = i.client_id
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE i.status NOT IN ('annulee', 'payee')
AND i.deleted_at IS NULL
GROUP BY i.id, c.nom
HAVING i.total_ttc - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'payment'), 0) > 0;

-- ============================================================================
-- 5. Vue: Factures fournisseur en attente de paiement (pour association)
-- ============================================================================

CREATE OR REPLACE VIEW pending_supplier_invoices AS
SELECT
  si.id,
  si.user_id,
  si.numero,
  si.supplier_id,
  c.nom AS supplier_name,
  si.date_facture,
  si.date_echeance,
  si.total_ttc,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'supplier_payment'), 0) AS total_paid,
  si.total_ttc - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'supplier_payment'), 0) AS remaining,
  si.status
FROM supplier_invoices si
LEFT JOIN clients c ON c.id = si.supplier_id
LEFT JOIN payments p ON p.supplier_invoice_id = si.id
WHERE si.status NOT IN ('paid', 'cancelled')
AND si.deleted_at IS NULL
GROUP BY si.id, c.nom
HAVING si.total_ttc - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'supplier_payment'), 0) > 0;

-- ============================================================================
-- 6. Fonction: Associer un paiement existant a une facture client
-- ============================================================================

CREATE OR REPLACE FUNCTION associate_payment_to_invoice(
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_invoice invoices%ROWTYPE;
  v_remaining DECIMAL;
  v_to_allocate DECIMAL;
  v_new_invoice_status TEXT;
BEGIN
  -- Recuperer le paiement
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement non trouve');
  END IF;

  -- Verifier que le paiement n'est pas deja associe
  IF v_payment.invoice_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement deja associe a une facture');
  END IF;

  -- Recuperer la facture
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Facture non trouvee');
  END IF;

  -- Verifier que client correspond
  IF v_payment.client_id != v_invoice.client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le client du paiement ne correspond pas a la facture');
  END IF;

  -- Calculer le reste a payer
  SELECT v_invoice.total_ttc - COALESCE(SUM(amount), 0)
  INTO v_remaining
  FROM payments
  WHERE invoice_id = p_invoice_id AND payment_type = 'payment';

  -- Montant a affecter
  v_to_allocate := COALESCE(p_amount, LEAST(v_payment.amount, v_remaining));

  IF v_to_allocate <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Facture deja payee');
  END IF;

  IF v_to_allocate > v_payment.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Montant superieur au paiement disponible');
  END IF;

  -- Mettre a jour le paiement
  UPDATE payments
  SET
    invoice_id = p_invoice_id,
    payment_type = 'payment'
  WHERE id = p_payment_id;

  -- Calculer le nouveau solde et mettre a jour le statut de la facture
  SELECT v_invoice.total_ttc - COALESCE(SUM(amount), 0)
  INTO v_remaining
  FROM payments
  WHERE invoice_id = p_invoice_id AND payment_type = 'payment';

  IF v_remaining <= 0 THEN
    v_new_invoice_status := 'payee';
  ELSIF v_remaining < v_invoice.total_ttc THEN
    v_new_invoice_status := 'partielle';
  ELSE
    v_new_invoice_status := v_invoice.status;
  END IF;

  UPDATE invoices
  SET status = v_new_invoice_status
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'allocated', v_to_allocate,
    'remaining', v_remaining,
    'new_status', v_new_invoice_status
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Fonction: Associer un paiement existant a une facture fournisseur
-- ============================================================================

CREATE OR REPLACE FUNCTION associate_payment_to_supplier_invoice(
  p_payment_id UUID,
  p_supplier_invoice_id UUID,
  p_amount DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_invoice supplier_invoices%ROWTYPE;
  v_remaining DECIMAL;
  v_to_allocate DECIMAL;
  v_new_invoice_status TEXT;
BEGIN
  -- Recuperer le paiement
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement non trouve');
  END IF;

  -- Verifier que le paiement n'est pas deja associe
  IF v_payment.supplier_invoice_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement deja associe a une facture');
  END IF;

  -- Recuperer la facture fournisseur
  SELECT * INTO v_invoice FROM supplier_invoices WHERE id = p_supplier_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Facture fournisseur non trouvee');
  END IF;

  -- Verifier que fournisseur correspond
  IF v_payment.supplier_id != v_invoice.supplier_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le fournisseur du paiement ne correspond pas a la facture');
  END IF;

  -- Calculer le reste a payer
  SELECT v_invoice.total_ttc - COALESCE(SUM(amount), 0)
  INTO v_remaining
  FROM payments
  WHERE supplier_invoice_id = p_supplier_invoice_id AND payment_type = 'supplier_payment';

  -- Montant a affecter
  v_to_allocate := COALESCE(p_amount, LEAST(v_payment.amount, v_remaining));

  IF v_to_allocate <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Facture deja payee');
  END IF;

  IF v_to_allocate > v_payment.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Montant superieur au paiement disponible');
  END IF;

  -- Mettre a jour le paiement
  UPDATE payments
  SET
    supplier_invoice_id = p_supplier_invoice_id,
    payment_type = 'supplier_payment'
  WHERE id = p_payment_id;

  -- Calculer le nouveau solde et mettre a jour le statut de la facture
  SELECT v_invoice.total_ttc - COALESCE(SUM(amount), 0)
  INTO v_remaining
  FROM payments
  WHERE supplier_invoice_id = p_supplier_invoice_id AND payment_type = 'supplier_payment';

  IF v_remaining <= 0 THEN
    v_new_invoice_status := 'paid';
  ELSIF v_remaining < v_invoice.total_ttc THEN
    v_new_invoice_status := 'partial';
  ELSE
    v_new_invoice_status := v_invoice.status;
  END IF;

  UPDATE supplier_invoices
  SET status = v_new_invoice_status
  WHERE id = p_supplier_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'allocated', v_to_allocate,
    'remaining', v_remaining,
    'new_status', v_new_invoice_status
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Fonction: Dissocier un paiement d'une facture
-- ============================================================================

CREATE OR REPLACE FUNCTION dissociate_payment_from_invoice(p_payment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_invoice_id UUID;
  v_supplier_invoice_id UUID;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement non trouve');
  END IF;

  v_invoice_id := v_payment.invoice_id;
  v_supplier_invoice_id := v_payment.supplier_invoice_id;

  -- Dissocier
  UPDATE payments
  SET
    invoice_id = NULL,
    supplier_invoice_id = NULL,
    payment_type = CASE
      WHEN v_payment.payment_type = 'payment' THEN 'advance'
      WHEN v_payment.payment_type = 'supplier_payment' THEN 'supplier_advance'
      ELSE v_payment.payment_type
    END
  WHERE id = p_payment_id;

  -- Mettre a jour le statut de la facture si necessaire
  IF v_invoice_id IS NOT NULL THEN
    PERFORM update_invoice_status_from_payments(v_invoice_id);
  END IF;

  IF v_supplier_invoice_id IS NOT NULL THEN
    PERFORM update_supplier_invoice_status_from_payments(v_supplier_invoice_id);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Fonctions utilitaires pour mise a jour des statuts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invoice_status_from_payments(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_ttc DECIMAL;
  v_total_paid DECIMAL;
  v_new_status TEXT;
BEGIN
  SELECT total_ttc INTO v_total_ttc FROM invoices WHERE id = p_invoice_id;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE invoice_id = p_invoice_id AND payment_type = 'payment';

  IF v_total_paid >= v_total_ttc THEN
    v_new_status := 'payee';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partielle';
  ELSE
    v_new_status := 'envoyee';
  END IF;

  UPDATE invoices SET status = v_new_status WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_supplier_invoice_status_from_payments(p_supplier_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_ttc DECIMAL;
  v_total_paid DECIMAL;
  v_new_status TEXT;
BEGIN
  SELECT total_ttc INTO v_total_ttc FROM supplier_invoices WHERE id = p_supplier_invoice_id;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE supplier_invoice_id = p_supplier_invoice_id AND payment_type = 'supplier_payment';

  IF v_total_paid >= v_total_ttc THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE supplier_invoices SET status = v_new_status WHERE id = p_supplier_invoice_id;
END;
$$ LANGUAGE plpgsql;
