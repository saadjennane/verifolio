-- Migration 034: Fix the deal_is_late() function invoice query
-- The previous version tried to join invoices via deal_documents.invoice_id which doesn't exist
-- Invoices are actually linked to missions, not directly to deals

CREATE OR REPLACE FUNCTION deal_is_late(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deal_status TEXT;
  v_has_overdue_tasks BOOLEAN := false;
  v_has_overdue_missions BOOLEAN := false;
  v_has_overdue_invoices BOOLEAN := false;
  v_is_late BOOLEAN := false;
BEGIN
  -- Récupérer le statut du deal
  SELECT status INTO v_deal_status
  FROM deals
  WHERE id = p_deal_id;

  -- Un deal LOST ou ARCHIVED n'est jamais en retard
  IF v_deal_status IN ('lost', 'archived') THEN
    RETURN false;
  END IF;

  -- Vérifier les tâches en retard
  SELECT EXISTS (
    SELECT 1 FROM tasks
    WHERE deal_id = p_deal_id
    AND status != 'completed'
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE
  ) INTO v_has_overdue_tasks;

  -- Vérifier les missions en retard
  SELECT EXISTS (
    SELECT 1 FROM missions
    WHERE deal_id = p_deal_id
    AND status IN ('in_progress', 'delivered', 'to_invoice')
    AND (
      (delivered_at IS NULL AND started_at < CURRENT_DATE - INTERVAL '30 days')
      OR (to_invoice_at IS NOT NULL AND to_invoice_at < CURRENT_DATE AND invoiced_at IS NULL)
    )
  ) INTO v_has_overdue_missions;

  -- Vérifier les factures impayées échues
  -- Les factures sont liées aux missions, pas directement aux deals
  SELECT EXISTS (
    SELECT 1 FROM invoices i
    JOIN missions m ON m.id = i.mission_id
    WHERE m.deal_id = p_deal_id
    AND i.status != 'payee'
    AND i.date_echeance < CURRENT_DATE
  ) INTO v_has_overdue_invoices;

  v_is_late := v_has_overdue_tasks OR v_has_overdue_missions OR v_has_overdue_invoices;

  RETURN v_is_late;
END;
$$ LANGUAGE plpgsql;
