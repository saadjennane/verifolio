-- Migration 035: Fix the invoice trigger for deal late badge
-- The trigger tried to use deal_documents.invoice_id which doesn't exist
-- Invoices are linked to missions, and missions are linked to deals

CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_ids UUID[];
BEGIN
  -- Récupérer les deal_ids affectés via missions
  -- Les factures sont liées aux missions via invoices.mission_id
  -- Les missions sont liées aux deals via missions.deal_id
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.mission_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT m.deal_id) INTO v_deal_ids
    FROM missions m
    WHERE m.id = NEW.mission_id
    AND m.deal_id IS NOT NULL;
  ELSIF TG_OP = 'DELETE' AND OLD.mission_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT m.deal_id) INTO v_deal_ids
    FROM missions m
    WHERE m.id = OLD.mission_id
    AND m.deal_id IS NOT NULL;
  END IF;

  -- Synchroniser les badges pour tous les deals affectés
  IF v_deal_ids IS NOT NULL AND array_length(v_deal_ids, 1) > 0 THEN
    PERFORM sync_deal_late_badge(unnest(v_deal_ids));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_deal_late_badge_on_invoice ON invoices;
CREATE TRIGGER sync_deal_late_badge_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_invoice();
