-- Migration 038: Final complete fix for all badge-related functions and triggers
-- This migration fixes ALL issues including tasks table structure

-- =============================================================================
-- 1. DROP ALL EXISTING TRIGGERS AND FUNCTIONS
-- =============================================================================

DROP TRIGGER IF EXISTS sync_deal_late_badge_on_task ON tasks;
DROP TRIGGER IF EXISTS sync_deal_late_badge_on_mission ON missions;
DROP TRIGGER IF EXISTS sync_deal_late_badge_on_invoice ON invoices;

DROP FUNCTION IF EXISTS trigger_sync_deal_late_badge_from_task() CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_deal_late_badge_from_mission() CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_deal_late_badge_from_invoice() CASCADE;
DROP FUNCTION IF EXISTS sync_deal_late_badge(UUID) CASCADE;
DROP FUNCTION IF EXISTS deal_is_late(UUID) CASCADE;

-- =============================================================================
-- 2. RECREATE deal_is_late FUNCTION (FULLY CORRECTED)
-- =============================================================================

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
  -- IMPORTANT: tasks utilise entity_type/entity_id, pas deal_id directement
  SELECT EXISTS (
    SELECT 1 FROM tasks
    WHERE entity_type = 'deal'
    AND entity_id = p_deal_id
    AND status != 'done'
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
  -- IMPORTANT: Les factures sont liées aux missions via invoices.mission_id
  SELECT EXISTS (
    SELECT 1 FROM invoices i
    JOIN missions m ON m.id = i.mission_id
    WHERE m.deal_id = p_deal_id
    AND i.status != 'payee'
    AND i.date_echeance IS NOT NULL
    AND i.date_echeance < CURRENT_DATE
  ) INTO v_has_overdue_invoices;

  v_is_late := v_has_overdue_tasks OR v_has_overdue_missions OR v_has_overdue_invoices;

  RETURN v_is_late;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. RECREATE sync_deal_late_badge FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_deal_late_badge(p_deal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_late BOOLEAN;
  v_badge_exists BOOLEAN;
BEGIN
  -- Vérifier si le deal est en retard
  v_is_late := deal_is_late(p_deal_id);

  -- Vérifier si le badge existe déjà
  SELECT EXISTS (
    SELECT 1 FROM deal_badges
    WHERE deal_id = p_deal_id
    AND badge = 'EN RETARD'
  ) INTO v_badge_exists;

  -- Ajouter le badge si nécessaire
  IF v_is_late AND NOT v_badge_exists THEN
    INSERT INTO deal_badges (deal_id, badge, variant)
    VALUES (p_deal_id, 'EN RETARD', 'red')
    ON CONFLICT (deal_id, badge) DO NOTHING;
  END IF;

  -- Retirer le badge si plus en retard
  IF NOT v_is_late AND v_badge_exists THEN
    DELETE FROM deal_badges
    WHERE deal_id = p_deal_id
    AND badge = 'EN RETARD';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. RECREATE TRIGGER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_task()
RETURNS TRIGGER AS $$
BEGIN
  -- IMPORTANT: tasks utilise entity_type/entity_id, pas deal_id
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.entity_type = 'deal' AND NEW.entity_id IS NOT NULL THEN
    PERFORM sync_deal_late_badge(NEW.entity_id);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.entity_type = 'deal' AND OLD.entity_id IS NOT NULL THEN
    PERFORM sync_deal_late_badge(OLD.entity_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_mission()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.deal_id IS NOT NULL THEN
    PERFORM sync_deal_late_badge(NEW.deal_id);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.deal_id IS NOT NULL THEN
    PERFORM sync_deal_late_badge(OLD.deal_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_ids UUID[];
BEGIN
  -- IMPORTANT: Les factures sont liées aux missions via invoices.mission_id
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

-- =============================================================================
-- 5. RECREATE ALL TRIGGERS
-- =============================================================================

CREATE TRIGGER sync_deal_late_badge_on_task
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_task();

CREATE TRIGGER sync_deal_late_badge_on_mission
AFTER INSERT OR UPDATE OR DELETE ON missions
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_mission();

CREATE TRIGGER sync_deal_late_badge_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_invoice();
