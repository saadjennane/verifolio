-- Migration 040: Refonte du système de statuts et badges des tasks
-- Ajoute le statut 'en_attente' et un système de badges pour les tasks

-- =============================================================================
-- 1. CRÉER LA TABLE task_badges
-- =============================================================================

CREATE TABLE task_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_task_badge UNIQUE (task_id, badge)
);

CREATE INDEX idx_task_badges_task_id ON task_badges(task_id);

ALTER TABLE task_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_badges_user_policy ON task_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_badges.task_id
      AND tasks.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. MODIFIER LE CHECK CONSTRAINT DES STATUTS
-- =============================================================================

-- Supprimer l'ancien constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Ajouter le nouveau constraint avec 'en_attente'
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'en_attente', 'done'));

-- =============================================================================
-- 3. CRÉER LES FONCTIONS POUR LE BADGE EN RETARD
-- =============================================================================

-- Fonction pour vérifier si une task est en retard
CREATE OR REPLACE FUNCTION task_is_overdue(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
BEGIN
  SELECT status, due_date INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  -- Une task done n'est jamais en retard
  IF v_task.status = 'done' THEN
    RETURN false;
  END IF;

  -- Vérifier si la due_date est dépassée
  IF v_task.due_date IS NOT NULL AND v_task.due_date < CURRENT_DATE THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser le badge EN RETARD
CREATE OR REPLACE FUNCTION sync_task_overdue_badge(p_task_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_overdue BOOLEAN;
  v_badge_exists BOOLEAN;
BEGIN
  v_is_overdue := task_is_overdue(p_task_id);

  SELECT EXISTS (
    SELECT 1 FROM task_badges
    WHERE task_id = p_task_id
    AND badge = 'EN RETARD'
  ) INTO v_badge_exists;

  -- Ajouter le badge si en retard
  IF v_is_overdue AND NOT v_badge_exists THEN
    INSERT INTO task_badges (task_id, badge, variant)
    VALUES (p_task_id, 'EN RETARD', 'red')
    ON CONFLICT (task_id, badge) DO NOTHING;
  END IF;

  -- Retirer le badge si plus en retard
  IF NOT v_is_overdue AND v_badge_exists THEN
    DELETE FROM task_badges
    WHERE task_id = p_task_id
    AND badge = 'EN RETARD';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. CRÉER LE TRIGGER POUR SYNC AUTOMATIQUE
-- =============================================================================

-- Trigger function pour sync automatique du badge EN RETARD
CREATE OR REPLACE FUNCTION trigger_sync_task_overdue_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM sync_task_overdue_badge(NEW.id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER sync_task_overdue_badge_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_task_overdue_badge();
