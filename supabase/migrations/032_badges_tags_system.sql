-- Migration 032: Système de badges automatiques et tags avec palette

-- =============================================================================
-- 1. BADGES PRÉDÉFINIS
-- =============================================================================

-- Table pour les types de badges disponibles
CREATE TABLE IF NOT EXISTS badge_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'gray' CHECK (variant IN ('gray', 'blue', 'green', 'yellow', 'red')),
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  description TEXT
);

-- Insérer les badges prédéfinis
INSERT INTO badge_types (id, label, variant, is_automatic, description) VALUES
  ('en_retard', 'EN RETARD', 'red', true, 'Affiché automatiquement si tâche échue, mission en retard ou facture impayée'),
  ('urgent', 'URGENT', 'red', false, 'À traiter en priorité'),
  ('important', 'IMPORTANT', 'yellow', false, 'Nécessite une attention particulière'),
  ('attente_client', 'EN ATTENTE CLIENT', 'blue', false, 'En attente d''une action du client'),
  ('relance', 'À RELANCER', 'yellow', false, 'Nécessite une relance'),
  ('bloque', 'BLOQUÉ', 'red', false, 'Bloqué par un obstacle'),
  ('opportunite', 'OPPORTUNITÉ', 'green', false, 'Opportunité de vente additionnelle')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. PALETTE DE COULEURS POUR LES TAGS
-- =============================================================================

-- Table pour les couleurs de tags disponibles
CREATE TABLE IF NOT EXISTS tag_colors (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  hex_value TEXT NOT NULL,
  tailwind_class TEXT NOT NULL
);

-- Insérer la palette de couleurs
INSERT INTO tag_colors (id, label, hex_value, tailwind_class) VALUES
  ('gray', 'Gris', '#6B7280', 'bg-gray-200 text-gray-800'),
  ('red', 'Rouge', '#EF4444', 'bg-red-200 text-red-800'),
  ('orange', 'Orange', '#F97316', 'bg-orange-200 text-orange-800'),
  ('yellow', 'Jaune', '#F59E0B', 'bg-yellow-200 text-yellow-800'),
  ('green', 'Vert', '#10B981', 'bg-green-200 text-green-800'),
  ('blue', 'Bleu', '#3B82F6', 'bg-blue-200 text-blue-800'),
  ('indigo', 'Indigo', '#6366F1', 'bg-indigo-200 text-indigo-800'),
  ('purple', 'Violet', '#8B5CF6', 'bg-purple-200 text-purple-800'),
  ('pink', 'Rose', '#EC4899', 'bg-pink-200 text-pink-800')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. FONCTION POUR VÉRIFIER LE BADGE "EN RETARD" SUR UN DEAL
-- =============================================================================

CREATE OR REPLACE FUNCTION check_deal_late_badge(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_late BOOLEAN := false;
  v_has_overdue_tasks BOOLEAN;
  v_has_overdue_missions BOOLEAN;
  v_has_overdue_invoices BOOLEAN;
BEGIN
  -- Vérifier les tâches échues liées au deal
  SELECT EXISTS (
    SELECT 1 FROM tasks
    WHERE entity_type = 'deal'
    AND entity_id = p_deal_id
    AND status = 'open'
    AND due_date < CURRENT_DATE
  ) INTO v_has_overdue_tasks;

  -- Vérifier les missions en retard liées au deal
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

-- =============================================================================
-- 4. FONCTION POUR SYNCHRONISER LE BADGE "EN RETARD"
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_deal_late_badge(p_deal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_late BOOLEAN;
  v_badge_exists BOOLEAN;
BEGIN
  -- Vérifier si le deal devrait avoir le badge EN RETARD
  v_is_late := check_deal_late_badge(p_deal_id);

  -- Vérifier si le badge existe déjà
  SELECT EXISTS (
    SELECT 1 FROM deal_badges
    WHERE deal_id = p_deal_id
    AND badge = 'EN RETARD'
  ) INTO v_badge_exists;

  -- Ajouter le badge s'il devrait être là mais n'y est pas
  IF v_is_late AND NOT v_badge_exists THEN
    INSERT INTO deal_badges (deal_id, badge, variant)
    VALUES (p_deal_id, 'EN RETARD', 'red')
    ON CONFLICT (deal_id, badge) DO NOTHING;
  END IF;

  -- Retirer le badge s'il ne devrait pas être là mais y est
  IF NOT v_is_late AND v_badge_exists THEN
    DELETE FROM deal_badges
    WHERE deal_id = p_deal_id
    AND badge = 'EN RETARD';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. TRIGGERS POUR BADGE AUTOMATIQUE
-- =============================================================================

-- Trigger sur les tâches
CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_task()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.entity_type = 'deal' THEN
    PERFORM sync_deal_late_badge(NEW.entity_id);
  END IF;

  IF TG_OP = 'DELETE' AND OLD.entity_type = 'deal' THEN
    PERFORM sync_deal_late_badge(OLD.entity_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_deal_late_badge_on_task ON tasks;
CREATE TRIGGER sync_deal_late_badge_on_task
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_task();

-- Trigger sur les missions
CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_mission()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.deal_id IS NOT NULL THEN
    PERFORM sync_deal_late_badge(NEW.deal_id);
  END IF;

  IF TG_OP = 'DELETE' AND OLD.deal_id IS NOT NULL THEN
    PERFORM sync_deal_late_badge(OLD.deal_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_deal_late_badge_on_mission ON missions;
CREATE TRIGGER sync_deal_late_badge_on_mission
AFTER INSERT OR UPDATE OR DELETE ON missions
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_mission();

-- Trigger sur les factures via deal_documents
CREATE OR REPLACE FUNCTION trigger_sync_deal_late_badge_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_ids UUID[];
BEGIN
  -- Récupérer les deal_ids affectés
  IF TG_OP = 'UPDATE' AND NEW.invoice_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT deal_id) INTO v_deal_ids
    FROM deal_documents
    WHERE invoice_id = NEW.id;
  ELSIF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT deal_id) INTO v_deal_ids
    FROM deal_documents
    WHERE invoice_id = OLD.id;
  END IF;

  -- Synchroniser les badges pour tous les deals affectés
  IF v_deal_ids IS NOT NULL THEN
    PERFORM sync_deal_late_badge(unnest(v_deal_ids));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_deal_late_badge_on_invoice ON invoices;
CREATE TRIGGER sync_deal_late_badge_on_invoice
AFTER UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_deal_late_badge_from_invoice();

-- =============================================================================
-- 6. CONTRAINTES SUR LES BADGES
-- =============================================================================

-- Empêcher l'ajout manuel du badge EN RETARD
CREATE OR REPLACE FUNCTION prevent_manual_automatic_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si c'est un badge automatique
  IF NEW.badge IN (SELECT id FROM badge_types WHERE is_automatic = true) THEN
    -- Autoriser seulement si appelé par le système (via sync function)
    IF current_setting('app.allow_automatic_badge', true) IS NULL THEN
      RAISE EXCEPTION 'Le badge % est automatique et ne peut pas être ajouté manuellement', NEW.badge;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_manual_automatic_badge_deal ON deal_badges;
CREATE TRIGGER prevent_manual_automatic_badge_deal
BEFORE INSERT ON deal_badges
FOR EACH ROW
EXECUTE FUNCTION prevent_manual_automatic_badge();

DROP TRIGGER IF EXISTS prevent_manual_automatic_badge_mission ON mission_badges;
CREATE TRIGGER prevent_manual_automatic_badge_mission
BEFORE INSERT ON mission_badges
FOR EACH ROW
EXECUTE FUNCTION prevent_manual_automatic_badge();

-- =============================================================================
-- 7. FONCTION POUR PERMETTRE LES BADGES AUTOMATIQUES
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_deal_late_badge(p_deal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_late BOOLEAN;
  v_badge_exists BOOLEAN;
BEGIN
  -- Autoriser temporairement les badges automatiques
  PERFORM set_config('app.allow_automatic_badge', 'true', true);

  -- Vérifier si le deal devrait avoir le badge EN RETARD
  v_is_late := check_deal_late_badge(p_deal_id);

  -- Vérifier si le badge existe déjà
  SELECT EXISTS (
    SELECT 1 FROM deal_badges
    WHERE deal_id = p_deal_id
    AND badge = 'EN RETARD'
  ) INTO v_badge_exists;

  -- Ajouter le badge s'il devrait être là mais n'y est pas
  IF v_is_late AND NOT v_badge_exists THEN
    INSERT INTO deal_badges (deal_id, badge, variant)
    VALUES (p_deal_id, 'EN RETARD', 'red')
    ON CONFLICT (deal_id, badge) DO NOTHING;
  END IF;

  -- Retirer le badge s'il ne devrait pas être là mais y est
  IF NOT v_is_late AND v_badge_exists THEN
    DELETE FROM deal_badges
    WHERE deal_id = p_deal_id
    AND badge = 'EN RETARD';
  END IF;

  -- Réinitialiser la configuration
  PERFORM set_config('app.allow_automatic_badge', NULL, true);
END;
$$ LANGUAGE plpgsql;
