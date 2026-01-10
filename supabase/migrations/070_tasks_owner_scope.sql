-- Migration 070: Extension Todos avec dépendance Client/Fournisseur
-- Permet de définir de qui dépend une tâche (moi, client, fournisseur)

-- ============================================
-- 1. Table mission_suppliers (fournisseurs liés à une mission)
-- ============================================

-- Note: Les fournisseurs sont des clients avec is_supplier=true (voir migration 069)
CREATE TABLE mission_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(mission_id, supplier_id)
);

CREATE INDEX idx_mission_suppliers_mission ON mission_suppliers(mission_id);
CREATE INDEX idx_mission_suppliers_supplier ON mission_suppliers(supplier_id);
CREATE INDEX idx_mission_suppliers_user ON mission_suppliers(user_id);

ALTER TABLE mission_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mission suppliers" ON mission_suppliers
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 2. Extension de la table tasks
-- ============================================

-- Ajouter owner_scope: qui est responsable/bloquant pour cette tâche
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS owner_scope TEXT NOT NULL DEFAULT 'me'
  CHECK (owner_scope IN ('me', 'client', 'supplier'));

-- Ajouter owner_entity_id: référence vers le client ou fournisseur
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS owner_entity_id UUID;

-- Index pour filtrer par owner
CREATE INDEX IF NOT EXISTS idx_tasks_owner_scope ON tasks(owner_scope);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_entity ON tasks(owner_entity_id);

-- ============================================
-- 3. Fonction de validation owner_scope / owner_entity_id
-- ============================================

CREATE OR REPLACE FUNCTION validate_task_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Si owner_scope = 'me', owner_entity_id doit être null
  IF NEW.owner_scope = 'me' THEN
    NEW.owner_entity_id = NULL;
  END IF;

  -- Si owner_scope = 'client' ou 'supplier', owner_entity_id est requis
  IF NEW.owner_scope IN ('client', 'supplier') AND NEW.owner_entity_id IS NULL THEN
    RAISE EXCEPTION 'owner_entity_id is required when owner_scope is client or supplier';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_validate_owner_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_owner();

-- ============================================
-- 4. Mise à jour du trigger completed_at pour supporter en_attente
-- ============================================

CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status IN ('open', 'en_attente') AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Vue pour récupérer les tâches enrichies avec owner info
-- ============================================

-- Note: owner_entity_id pointe vers clients pour client ET supplier
-- (les fournisseurs sont des clients avec is_supplier=true, mais on n'a pas besoin de vérifier ici)
CREATE OR REPLACE VIEW tasks_with_owner AS
SELECT
  t.*,
  CASE
    WHEN t.owner_scope IN ('client', 'supplier') THEN owner_ref.nom
    ELSE NULL
  END AS owner_name,
  t.owner_scope AS owner_type_label
FROM tasks t
LEFT JOIN clients owner_ref ON t.owner_scope IN ('client', 'supplier') AND t.owner_entity_id = owner_ref.id;

-- ============================================
-- 6. Fonction helper pour obtenir les fournisseurs d'une mission
-- ============================================

CREATE OR REPLACE FUNCTION get_mission_suppliers(p_mission_id UUID)
RETURNS TABLE (
  supplier_id UUID,
  supplier_nom TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.supplier_id,
    c.nom
  FROM mission_suppliers ms
  JOIN clients c ON c.id = ms.supplier_id
  WHERE ms.mission_id = p_mission_id
  ORDER BY c.nom;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Commentaires pour documentation
-- ============================================

COMMENT ON COLUMN tasks.owner_scope IS 'Qui est responsable/bloquant: me (freelance), client, supplier';
COMMENT ON COLUMN tasks.owner_entity_id IS 'ID du client ou fournisseur si owner_scope != me';
COMMENT ON TABLE mission_suppliers IS 'Fournisseurs impliqués dans une mission (indépendamment des factures)';
