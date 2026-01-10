-- ============================================================================
-- Migration 052: User Activity Variables
-- Variables personnalisées par activité du freelance
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Type ENUM pour les types de variables
-- ----------------------------------------------------------------------------

CREATE TYPE user_variable_type AS ENUM (
  'text',           -- Texte libre
  'number',         -- Nombre
  'date_or_period'  -- Date ou période
);

-- Type ENUM pour la source
CREATE TYPE variable_source AS ENUM (
  'seed',   -- Copié depuis job_profile_variables
  'custom'  -- Créé manuellement par l'utilisateur
);

-- ----------------------------------------------------------------------------
-- Table: user_activity_variables
-- ----------------------------------------------------------------------------

CREATE TABLE user_activity_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                    -- snake_case, ex: "participants_count"
  label TEXT NOT NULL,                  -- ex: "Nombre de participants"
  type user_variable_type NOT NULL DEFAULT 'text',
  source variable_source NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Une seule variable avec cette key par activité
  UNIQUE(activity_id, key)
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_user_activity_variables_user ON user_activity_variables(user_id);
CREATE INDEX idx_user_activity_variables_activity ON user_activity_variables(activity_id);
CREATE INDEX idx_user_activity_variables_sort ON user_activity_variables(activity_id, sort_order);

-- ----------------------------------------------------------------------------
-- Trigger: Limiter à 20 variables par activité
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_max_activity_variables()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_activity_variables WHERE activity_id = NEW.activity_id) >= 20 THEN
    RAISE EXCEPTION 'Une activité ne peut pas avoir plus de 20 variables';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_activity_variables
  BEFORE INSERT ON user_activity_variables
  FOR EACH ROW
  EXECUTE FUNCTION check_max_activity_variables();

-- ----------------------------------------------------------------------------
-- Fonction: Copier les variables seed lors de la création d'une activité
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION copy_seed_variables_to_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_record RECORD;
  v_type user_variable_type;
BEGIN
  -- Pour chaque variable du job_profile
  FOR v_record IN
    SELECT key, label, type, position
    FROM job_profile_variables
    WHERE profile_id = NEW.job_profile_id
    ORDER BY position
  LOOP
    -- Mapper les types seed vers nos types restreints
    -- text, number, duration -> text, number, date_or_period
    CASE v_record.type::text
      WHEN 'number' THEN v_type := 'number';
      WHEN 'duration' THEN v_type := 'date_or_period';
      WHEN 'date_or_period' THEN v_type := 'date_or_period';
      ELSE v_type := 'text';
    END CASE;

    -- Insérer la variable copiée
    INSERT INTO user_activity_variables (
      user_id,
      activity_id,
      key,
      label,
      type,
      source,
      is_active,
      sort_order
    ) VALUES (
      NEW.user_id,
      NEW.id,
      v_record.key,
      v_record.label,
      v_type,
      'seed',
      true,
      v_record.position
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copy_variables_on_activity_create
  AFTER INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION copy_seed_variables_to_activity();

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

ALTER TABLE user_activity_variables ENABLE ROW LEVEL SECURITY;

-- Select : uniquement ses propres variables
CREATE POLICY "user_activity_variables_select_own" ON user_activity_variables
  FOR SELECT USING (auth.uid() = user_id);

-- Insert : uniquement pour soi-même
CREATE POLICY "user_activity_variables_insert_own" ON user_activity_variables
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update : uniquement ses propres variables
CREATE POLICY "user_activity_variables_update_own" ON user_activity_variables
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete : uniquement ses propres variables
CREATE POLICY "user_activity_variables_delete_own" ON user_activity_variables
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Commentaires
-- ----------------------------------------------------------------------------

COMMENT ON TABLE user_activity_variables IS 'Variables personnalisées par activité du freelance';
COMMENT ON COLUMN user_activity_variables.key IS 'Identifiant snake_case unique par activité';
COMMENT ON COLUMN user_activity_variables.source IS 'seed = copié depuis job_profile_variables, custom = créé manuellement';
COMMENT ON COLUMN user_activity_variables.is_active IS 'Variable active ou désactivée';
