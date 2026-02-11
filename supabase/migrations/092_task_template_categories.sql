-- ============================================================================
-- Migration 092: Task Template Categories
-- Adds category and subgroup columns for visual organization of task templates
-- ============================================================================

-- ============================================================================
-- 1) Add columns to task_template_items
-- ============================================================================

ALTER TABLE task_template_items
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Général';

ALTER TABLE task_template_items
  ADD COLUMN IF NOT EXISTS subgroup TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_task_template_items_category
  ON task_template_items(category);

COMMENT ON COLUMN task_template_items.category IS 'Catégorie pour regroupement visuel (ex: Administratif, Numéros, Logistique)';
COMMENT ON COLUMN task_template_items.subgroup IS 'Sous-groupe optionnel au sein de la catégorie (ex: Book Test, Prédiction)';

-- ============================================================================
-- 2) Add columns to tasks table
-- Tasks created from templates will carry the category/subgroup
-- ============================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Sans catégorie';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS subgroup TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_category
  ON tasks(category);

CREATE INDEX IF NOT EXISTS idx_tasks_entity_category
  ON tasks(entity_type, entity_id, category);

COMMENT ON COLUMN tasks.category IS 'Catégorie pour regroupement visuel des tâches';
COMMENT ON COLUMN tasks.subgroup IS 'Sous-groupe optionnel au sein de la catégorie';

-- ============================================================================
-- 3) Update apply_task_template function to copy category/subgroup
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_task_template(
  p_template_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_reference_date DATE,
  p_user_id UUID
)
RETURNS SETOF tasks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_new_task tasks%ROWTYPE;
BEGIN
  -- Verify template exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM task_templates
    WHERE id = p_template_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;

  -- Create tasks for each template item
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
      is_system,
      owner_scope,
      category,
      subgroup
    ) VALUES (
      p_user_id,
      v_item.title,
      v_item.description,
      p_reference_date + v_item.day_offset,
      'open',
      p_entity_type,
      p_entity_id,
      false,
      v_item.owner_scope,
      v_item.category,
      v_item.subgroup
    )
    RETURNING * INTO v_new_task;

    RETURN NEXT v_new_task;
  END LOOP;

  RETURN;
END;
$$;

-- ============================================================================
-- 4) Create view for getting distinct categories per user
-- ============================================================================

CREATE OR REPLACE VIEW user_task_template_categories AS
SELECT DISTINCT
  tt.user_id,
  tti.category,
  COUNT(DISTINCT tti.id) as item_count
FROM task_templates tt
JOIN task_template_items tti ON tti.template_id = tt.id
WHERE tt.is_active = true
GROUP BY tt.user_id, tti.category
ORDER BY tti.category;

-- Grant access to authenticated users
GRANT SELECT ON user_task_template_categories TO authenticated;

COMMENT ON VIEW user_task_template_categories IS 'Liste des catégories distinctes de templates de tâches par utilisateur';

-- ============================================================================
-- 5) Create view for templates grouped by category
-- ============================================================================

CREATE OR REPLACE VIEW task_template_items_by_category AS
SELECT
  tti.*,
  tt.user_id,
  tt.name as template_name,
  tt.target_entity_type
FROM task_template_items tti
JOIN task_templates tt ON tt.id = tti.template_id
WHERE tt.is_active = true
ORDER BY tti.category, tti.subgroup NULLS FIRST, tti.sort_order;

-- Grant access to authenticated users
GRANT SELECT ON task_template_items_by_category TO authenticated;

-- ============================================================================
-- 6) RLS for views (inherited from base tables through JOIN)
-- ============================================================================

-- The views use JOINs with task_templates which has RLS enabled,
-- so access is automatically restricted to the user's own templates.

