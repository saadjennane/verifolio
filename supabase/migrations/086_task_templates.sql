-- ============================================================================
-- Migration 086: Task Templates System
-- Permet de créer des templates de tâches à appliquer sur missions/deals/clients
-- ============================================================================

-- Table task_templates
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_entity_type TEXT CHECK (target_entity_type IN ('deal', 'mission', 'client')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table task_template_items
CREATE TABLE task_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  day_offset INT DEFAULT 0,  -- Jours après application (0 = aujourd'hui, 7 = dans 7 jours)
  sort_order INT NOT NULL DEFAULT 0,
  owner_scope TEXT DEFAULT 'me' CHECK (owner_scope IN ('me', 'client', 'supplier')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX idx_task_templates_target_entity ON task_templates(target_entity_type);
CREATE INDEX idx_task_templates_active ON task_templates(is_active);
CREATE INDEX idx_task_template_items_template_id ON task_template_items(template_id);
CREATE INDEX idx_task_template_items_sort ON task_template_items(template_id, sort_order);

-- Trigger updated_at pour task_templates
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;

-- Politique: utilisateur voit/modifie ses propres templates
CREATE POLICY task_templates_user_policy ON task_templates
  FOR ALL USING (user_id = auth.uid());

-- Politique: utilisateur voit/modifie les items de ses templates
CREATE POLICY task_template_items_user_policy ON task_template_items
  FOR ALL USING (
    template_id IN (
      SELECT id FROM task_templates WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Vue: Templates avec nombre d'items
-- ============================================================================

CREATE OR REPLACE VIEW task_templates_with_counts AS
SELECT
  t.id,
  t.user_id,
  t.name,
  t.description,
  t.target_entity_type,
  t.is_active,
  t.created_at,
  t.updated_at,
  COUNT(i.id) AS item_count,
  COALESCE(MAX(i.day_offset), 0) AS max_day_offset
FROM task_templates t
LEFT JOIN task_template_items i ON i.template_id = t.id
GROUP BY t.id;

-- ============================================================================
-- Fonction: Appliquer un template à une entité
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_task_template(
  p_template_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS SETOF tasks AS $$
DECLARE
  v_item RECORD;
  v_task tasks;
BEGIN
  -- Vérifier que le template appartient à l'utilisateur
  IF NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE id = p_template_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Template non trouvé ou non autorisé';
  END IF;

  -- Créer les tâches à partir des items du template
  FOR v_item IN
    SELECT * FROM task_template_items
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    INSERT INTO tasks (
      user_id,
      title,
      description,
      due_date,
      status,
      entity_type,
      entity_id,
      owner_scope,
      is_system
    ) VALUES (
      p_user_id,
      v_item.title,
      v_item.description,
      p_reference_date + v_item.day_offset,
      'open',
      p_entity_type,
      p_entity_id,
      v_item.owner_scope,
      false
    )
    RETURNING * INTO v_task;

    RETURN NEXT v_task;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Vue: Progression des tâches par entité
-- ============================================================================

CREATE OR REPLACE VIEW entity_task_progress AS
SELECT
  t.user_id,
  t.entity_type,
  t.entity_id,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE t.status = 'done') AS completed_tasks,
  COUNT(*) FILTER (WHERE t.status != 'done') AS pending_tasks,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE t.status = 'done')::NUMERIC / COUNT(*)) * 100)
  END AS progress_percent
FROM tasks t
WHERE t.entity_type IS NOT NULL AND t.entity_id IS NOT NULL
GROUP BY t.user_id, t.entity_type, t.entity_id;
