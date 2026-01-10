-- Migration 024: Système de tâches simple
-- Tasks système (auto) + Tasks manuelles

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),

  -- Lien vers entité (optionnel)
  entity_type TEXT CHECK (entity_type IN ('deal', 'mission', 'client', 'contact', 'invoice')),
  entity_id UUID,

  -- Flag système (task générée automatiquement)
  is_system BOOLEAN NOT NULL DEFAULT false,

  -- Date de complétion
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id);
CREATE INDEX idx_tasks_is_system ON tasks(is_system);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_user_policy ON tasks
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger pour auto-update completed_at
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status = 'open' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_task_completed_at();

-- Fonction pour créer une task système
CREATE OR REPLACE FUNCTION create_system_task(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_due_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_existing_task_id UUID;
BEGIN
  -- Vérifier si une task similaire existe déjà (open, même entité, même titre)
  SELECT id INTO v_existing_task_id
  FROM tasks
  WHERE user_id = p_user_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND title = p_title
    AND status = 'open'
    AND is_system = true
  LIMIT 1;

  IF v_existing_task_id IS NOT NULL THEN
    RETURN v_existing_task_id;
  END IF;

  -- Créer la task
  INSERT INTO tasks (user_id, title, description, entity_type, entity_id, is_system, due_date)
  VALUES (p_user_id, p_title, p_description, p_entity_type, p_entity_id, true, p_due_date)
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Mission DELIVERED → task "Facturer la mission"
CREATE OR REPLACE FUNCTION trigger_task_mission_delivered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'to_invoice' AND (OLD.status IS NULL OR OLD.status != 'to_invoice') THEN
    PERFORM create_system_task(
      NEW.user_id,
      'Facturer la mission',
      'La mission "' || NEW.title || '" est livrée et prête à être facturée.',
      'mission',
      NEW.id,
      CURRENT_DATE + INTERVAL '7 days' -- Due dans 7 jours
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_delivered_task_trigger
  AFTER INSERT OR UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_mission_delivered();

-- Trigger: Mission INVOICED (au moins une facture) → task "Demander un avis"
-- Note: Ce trigger se déclenche via mission_invoices
CREATE OR REPLACE FUNCTION trigger_task_mission_invoiced()
RETURNS TRIGGER AS $$
DECLARE
  v_mission RECORD;
BEGIN
  -- Récupérer la mission
  SELECT * INTO v_mission
  FROM missions
  WHERE id = NEW.mission_id;

  IF v_mission.status IN ('invoiced', 'paid') THEN
    PERFORM create_system_task(
      v_mission.user_id,
      'Demander un avis client',
      'La mission "' || v_mission.title || '" est facturée. Pensez à demander un avis client.',
      'mission',
      v_mission.id,
      CURRENT_DATE + INTERVAL '14 days' -- Due dans 14 jours
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_invoiced_task_trigger
  AFTER INSERT ON mission_invoices
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_mission_invoiced();

-- Optionnel: Auto-compléter les tasks système quand l'action est faite
-- Par exemple, task "facturer" → done quand status passe à INVOICED
CREATE OR REPLACE FUNCTION auto_complete_task_mission_invoiced()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'invoiced' AND (OLD.status IS NULL OR OLD.status != 'invoiced') THEN
    -- Marquer la task "Facturer la mission" comme done
    UPDATE tasks
    SET status = 'done'
    WHERE user_id = NEW.user_id
      AND entity_type = 'mission'
      AND entity_id = NEW.id
      AND title = 'Facturer la mission'
      AND status = 'open'
      AND is_system = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_invoiced_auto_complete_trigger
  AFTER UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_task_mission_invoiced();
