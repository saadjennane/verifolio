-- ============================================================================
-- Migration 051: User Activities
-- Activités/casquettes du freelance (max 10 par user)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: user_activities
-- ----------------------------------------------------------------------------

CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_profile_id TEXT NOT NULL REFERENCES job_profiles(id) ON DELETE CASCADE,
  label_override TEXT,                    -- Optionnel : renommer l'activité
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un user ne peut pas avoir 2x le même profil
  UNIQUE(user_id, job_profile_id)
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_user_activities_profile ON user_activities(job_profile_id);

-- Index partiel unique : un seul is_default=true par user
CREATE UNIQUE INDEX idx_user_activities_default
  ON user_activities(user_id)
  WHERE is_default = true;

-- ----------------------------------------------------------------------------
-- Trigger: Limiter à 10 activités par utilisateur
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_max_user_activities()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_activities WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Un utilisateur ne peut pas avoir plus de 10 activités';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_user_activities
  BEFORE INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION check_max_user_activities();

-- ----------------------------------------------------------------------------
-- Trigger: Auto-set default si première activité
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auto_set_default_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est la première activité de l'utilisateur, la mettre par défaut
  IF NOT EXISTS (
    SELECT 1 FROM user_activities
    WHERE user_id = NEW.user_id AND id != NEW.id
  ) THEN
    NEW.is_default := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_default_first_activity
  BEFORE INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_default_activity();

-- ----------------------------------------------------------------------------
-- Trigger: Réassigner default si suppression de l'activité default
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reassign_default_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'activité supprimée était la default
  IF OLD.is_default = true THEN
    -- Trouver la plus récente restante et la mettre default
    UPDATE user_activities
    SET is_default = true
    WHERE id = (
      SELECT id FROM user_activities
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reassign_default_after_delete
  AFTER DELETE ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION reassign_default_on_delete();

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Select : uniquement ses propres activités
CREATE POLICY "user_activities_select_own" ON user_activities
  FOR SELECT USING (auth.uid() = user_id);

-- Insert : uniquement pour soi-même
CREATE POLICY "user_activities_insert_own" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update : uniquement ses propres activités
CREATE POLICY "user_activities_update_own" ON user_activities
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete : uniquement ses propres activités
CREATE POLICY "user_activities_delete_own" ON user_activities
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Commentaires
-- ----------------------------------------------------------------------------

COMMENT ON TABLE user_activities IS 'Activités/casquettes du freelance (max 10)';
COMMENT ON COLUMN user_activities.label_override IS 'Permet de personnaliser le nom de l''activité';
COMMENT ON COLUMN user_activities.is_default IS 'Activité par défaut pour les nouvelles propositions';
