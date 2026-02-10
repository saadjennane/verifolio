-- ============================================================================
-- Migration 089: Subscriptions Module
-- Gestionnaire d'abonnements simple pour freelances
-- ============================================================================

-- ============================================================================
-- 1. Table subscriptions
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Fournisseur (obligatoire)
  supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Informations de l'abonnement
  name TEXT NOT NULL,                    -- Nom du service (ChatGPT, Figma...)
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MAD',

  -- Periodicite
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN (
    'monthly',    -- Mensuel
    'quarterly',  -- Trimestriel
    'yearly',     -- Annuel
    'custom'      -- Personnalise
  )),
  frequency_days INT,                    -- Nb jours si custom

  -- Dates
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,

  -- Options
  auto_debit BOOLEAN NOT NULL DEFAULT false,

  -- Statut
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',     -- En cours
    'suspended',  -- Suspendu temporairement
    'cancelled'   -- Resilie
  )),

  cancelled_at TIMESTAMPTZ,              -- Date de resiliation
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: frequency_days requis si custom
  CONSTRAINT subscription_custom_frequency CHECK (
    frequency != 'custom' OR frequency_days IS NOT NULL
  )
);

-- Index pour performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_supplier_id ON subscriptions(supplier_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_due_date ON subscriptions(next_due_date);

-- Trigger updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. RLS Policies
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_user_policy ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- 3. Ajouter colonnes a payments pour les abonnements
-- ============================================================================

-- Lien vers abonnement
ALTER TABLE payments
  ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Statut du paiement (pour les paiements programmes)
ALTER TABLE payments
  ADD COLUMN payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN (
    'pending',     -- A payer (manuel)
    'scheduled',   -- Programme (auto)
    'completed'    -- Effectue
  ));

-- Index
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_payment_status ON payments(payment_status);

-- ============================================================================
-- 4. Modifier contrainte payment_type pour inclure subscription
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN (
    'payment',           -- Paiement client sur facture (IN)
    'advance',           -- Avance client (IN)
    'refund',            -- Remboursement client (OUT)
    'supplier_payment',  -- Paiement fournisseur (OUT)
    'supplier_advance',  -- Avance fournisseur (OUT)
    'supplier_refund',   -- Remboursement fournisseur (IN)
    'subscription'       -- Paiement abonnement (OUT)
  ));

-- ============================================================================
-- 5. Modifier contrainte payment_has_target
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payment_has_target;

ALTER TABLE payments ADD CONSTRAINT payment_has_target
  CHECK (
    client_id IS NOT NULL
    OR invoice_id IS NOT NULL
    OR supplier_id IS NOT NULL
    OR supplier_invoice_id IS NOT NULL
    OR subscription_id IS NOT NULL
  );

-- ============================================================================
-- 6. Vue: Abonnements avec infos fournisseur
-- ============================================================================

CREATE OR REPLACE VIEW subscriptions_with_supplier AS
SELECT
  s.*,
  c.nom AS supplier_name,
  c.email AS supplier_email,
  -- Calcul du prochain paiement
  CASE
    WHEN s.status != 'active' THEN NULL
    WHEN s.next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN s.next_due_date = CURRENT_DATE THEN 'due_today'
    WHEN s.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'upcoming'
  END AS due_status
FROM subscriptions s
JOIN clients c ON c.id = s.supplier_id;

-- ============================================================================
-- 7. Vue: Paiements d'abonnement a venir/en cours
-- ============================================================================

CREATE OR REPLACE VIEW subscription_payments AS
SELECT
  p.id AS payment_id,
  p.user_id,
  p.subscription_id,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.payment_status,
  p.notes,
  s.name AS subscription_name,
  s.auto_debit,
  c.id AS supplier_id,
  c.nom AS supplier_name,
  CASE
    WHEN p.payment_status = 'completed' THEN 'completed'
    WHEN p.payment_date < CURRENT_DATE THEN 'overdue'
    WHEN p.payment_date = CURRENT_DATE THEN 'due_today'
    ELSE 'scheduled'
  END AS effective_status
FROM payments p
JOIN subscriptions s ON s.id = p.subscription_id
JOIN clients c ON c.id = s.supplier_id;

-- ============================================================================
-- 8. Fonction: Calculer prochaine echeance
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_due_date(
  current_date DATE,
  p_frequency TEXT,
  p_frequency_days INT DEFAULT NULL
)
RETURNS DATE AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'monthly' THEN current_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN current_date + INTERVAL '3 months'
    WHEN 'yearly' THEN current_date + INTERVAL '1 year'
    WHEN 'custom' THEN current_date + (p_frequency_days || ' days')::INTERVAL
    ELSE current_date + INTERVAL '1 month'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 9. Fonction: Generer paiements d'abonnement
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_subscription_payments(p_user_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  v_subscription RECORD;
  v_count INT := 0;
  v_new_status TEXT;
  v_payment_exists BOOLEAN;
BEGIN
  -- Pour chaque abonnement actif avec echeance dans les 30 jours
  FOR v_subscription IN
    SELECT s.*
    FROM subscriptions s
    WHERE s.status = 'active'
    AND s.next_due_date <= CURRENT_DATE + INTERVAL '30 days'
    AND (p_user_id IS NULL OR s.user_id = p_user_id)
  LOOP
    -- Verifier si le paiement existe deja pour cette echeance
    SELECT EXISTS(
      SELECT 1 FROM payments
      WHERE subscription_id = v_subscription.id
      AND payment_date = v_subscription.next_due_date
    ) INTO v_payment_exists;

    IF NOT v_payment_exists THEN
      -- Determiner le statut selon auto_debit et date
      IF v_subscription.auto_debit THEN
        IF v_subscription.next_due_date <= CURRENT_DATE THEN
          v_new_status := 'completed';
        ELSE
          v_new_status := 'scheduled';
        END IF;
      ELSE
        v_new_status := 'pending';
      END IF;

      -- Creer le paiement
      INSERT INTO payments (
        user_id,
        subscription_id,
        supplier_id,
        amount,
        payment_date,
        payment_method,
        payment_type,
        payment_status,
        notes
      ) VALUES (
        v_subscription.user_id,
        v_subscription.id,
        v_subscription.supplier_id,
        v_subscription.amount,
        v_subscription.next_due_date,
        CASE WHEN v_subscription.auto_debit THEN 'prelevement' ELSE 'virement' END,
        'subscription',
        v_new_status,
        v_subscription.name
      );

      v_count := v_count + 1;

      -- Si echeance passee, avancer next_due_date
      IF v_subscription.next_due_date <= CURRENT_DATE THEN
        UPDATE subscriptions
        SET next_due_date = calculate_next_due_date(
          v_subscription.next_due_date,
          v_subscription.frequency,
          v_subscription.frequency_days
        )
        WHERE id = v_subscription.id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Fonction: Marquer paiement abonnement comme effectue
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_subscription_payment(p_payment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
  v_payment_date DATE;
  v_frequency TEXT;
  v_frequency_days INT;
BEGIN
  -- Recuperer les infos du paiement
  SELECT p.subscription_id, p.payment_date, s.frequency, s.frequency_days
  INTO v_subscription_id, v_payment_date, v_frequency, v_frequency_days
  FROM payments p
  JOIN subscriptions s ON s.id = p.subscription_id
  WHERE p.id = p_payment_id
  AND p.payment_type = 'subscription'
  AND p.payment_status IN ('pending', 'scheduled');

  IF v_subscription_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Marquer comme complete
  UPDATE payments
  SET payment_status = 'completed'
  WHERE id = p_payment_id;

  -- Avancer next_due_date si necessaire
  UPDATE subscriptions
  SET next_due_date = calculate_next_due_date(
    v_payment_date,
    v_frequency,
    v_frequency_days
  )
  WHERE id = v_subscription_id
  AND next_due_date <= v_payment_date;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. Trigger: Auto-completer paiements auto_debit a la date d'echeance
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_complete_subscription_payments()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand on met a jour un abonnement, verifier les paiements schedules
  IF NEW.auto_debit = true AND NEW.status = 'active' THEN
    UPDATE payments
    SET payment_status = 'completed'
    WHERE subscription_id = NEW.id
    AND payment_type = 'subscription'
    AND payment_status = 'scheduled'
    AND payment_date <= CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_auto_complete_trigger
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_subscription_payments();

-- ============================================================================
-- 12. Mettre a jour la vue treasury_movements pour inclure abonnements
-- ============================================================================

DROP VIEW IF EXISTS treasury_movements;

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
  NULL::UUID AS subscription_id,
  p.client_id,
  NULL::UUID AS supplier_id,
  c.nom AS entity_name,
  i.numero AS document_number,
  COALESCE(p.payment_status, 'completed') AS payment_status,
  p.created_at
FROM payments p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.payment_type IN ('payment', 'advance', 'supplier_refund')
AND p.subscription_id IS NULL

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
  NULL::UUID AS subscription_id,
  NULL::UUID AS client_id,
  p.supplier_id,
  c.nom AS entity_name,
  si.numero AS document_number,
  COALESCE(p.payment_status, 'completed') AS payment_status,
  p.created_at
FROM payments p
LEFT JOIN clients c ON c.id = p.supplier_id
LEFT JOIN supplier_invoices si ON si.id = p.supplier_invoice_id
WHERE p.payment_type IN ('supplier_payment', 'supplier_advance', 'refund')
AND p.subscription_id IS NULL

UNION ALL

-- Paiements abonnements (decaissements)
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
  'subscription'::TEXT AS movement_type,
  NULL::UUID AS invoice_id,
  NULL::UUID AS supplier_invoice_id,
  p.subscription_id,
  NULL::UUID AS client_id,
  s.supplier_id,
  s.name AS entity_name,
  NULL::TEXT AS document_number,
  COALESCE(p.payment_status, 'completed') AS payment_status,
  p.created_at
FROM payments p
JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.payment_type = 'subscription';

-- ============================================================================
-- 13. Fonction RPC: Get subscriptions summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subscriptions_summary(p_user_id UUID)
RETURNS TABLE (
  total_monthly DECIMAL,
  total_yearly DECIMAL,
  active_count INT,
  pending_payments INT,
  overdue_payments INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total mensuel (converti pour uniformite)
    COALESCE(SUM(
      CASE s.frequency
        WHEN 'monthly' THEN s.amount
        WHEN 'quarterly' THEN s.amount / 3
        WHEN 'yearly' THEN s.amount / 12
        WHEN 'custom' THEN s.amount * 30.0 / COALESCE(s.frequency_days, 30)
        ELSE s.amount
      END
    ) FILTER (WHERE s.status = 'active'), 0)::DECIMAL AS total_monthly,

    -- Total annuel
    COALESCE(SUM(
      CASE s.frequency
        WHEN 'monthly' THEN s.amount * 12
        WHEN 'quarterly' THEN s.amount * 4
        WHEN 'yearly' THEN s.amount
        WHEN 'custom' THEN s.amount * 365.0 / COALESCE(s.frequency_days, 30)
        ELSE s.amount * 12
      END
    ) FILTER (WHERE s.status = 'active'), 0)::DECIMAL AS total_yearly,

    -- Nombre actifs
    COUNT(*) FILTER (WHERE s.status = 'active')::INT AS active_count,

    -- Paiements en attente
    (SELECT COUNT(*) FROM payments p
     WHERE p.user_id = p_user_id
     AND p.payment_type = 'subscription'
     AND p.payment_status = 'pending')::INT AS pending_payments,

    -- Paiements en retard
    (SELECT COUNT(*) FROM payments p
     WHERE p.user_id = p_user_id
     AND p.payment_type = 'subscription'
     AND p.payment_status = 'pending'
     AND p.payment_date < CURRENT_DATE)::INT AS overdue_payments

  FROM subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
