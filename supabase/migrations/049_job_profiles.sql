-- ============================================================================
-- Migration 049: Job Profiles & Variables
-- Base de données métiers → variables suggérées pour les Propositions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Types ENUM
-- ----------------------------------------------------------------------------

-- Catégories de métiers
CREATE TYPE job_profile_category AS ENUM (
  'event',    -- Événementiel
  'b2b',      -- Services B2B (consulting, coaching...)
  'tech',     -- Technique (dev, no-code...)
  'creative', -- Créatif (design, photo, vidéo, rédaction...)
  'field',    -- Terrain (artisan, architecte...)
  'admin',    -- Administratif
  'other'     -- Autre
);

-- Types de variables
CREATE TYPE job_variable_type AS ENUM (
  'text',     -- Texte libre
  'number',   -- Nombre
  'duration', -- Durée (ex: "2h", "3 jours")
  'select',   -- Liste de choix
  'boolean'   -- Oui/Non
);

-- ----------------------------------------------------------------------------
-- Table: job_profiles (métiers)
-- ----------------------------------------------------------------------------

CREATE TABLE job_profiles (
  id TEXT PRIMARY KEY,                    -- Ex: "mentalist", "developer"
  label TEXT NOT NULL,                    -- Ex: "Mentaliste / Magicien / Animateur"
  category job_profile_category NOT NULL DEFAULT 'other',
  position INTEGER NOT NULL DEFAULT 0,    -- Ordre d'affichage
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour tri et filtrage
CREATE INDEX idx_job_profiles_category ON job_profiles(category);
CREATE INDEX idx_job_profiles_position ON job_profiles(position);
CREATE INDEX idx_job_profiles_active ON job_profiles(is_active) WHERE is_active = true;

-- Trigger updated_at
CREATE TRIGGER update_job_profiles_updated_at
  BEFORE UPDATE ON job_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Table: job_profile_variables (variables suggérées par métier)
-- ----------------------------------------------------------------------------

CREATE TABLE job_profile_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES job_profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                      -- Ex: "participants_count" (snake_case)
  label TEXT NOT NULL,                    -- Ex: "Nombre de participants"
  type job_variable_type NOT NULL DEFAULT 'text',
  options JSONB,                          -- Pour type 'select': ["Option1", "Option2"]
  required_suggestion BOOLEAN NOT NULL DEFAULT false,  -- Variable suggérée comme importante
  examples TEXT[],                        -- Ex: {"50", "150", "300"}
  help TEXT,                              -- Aide contextuelle
  position INTEGER NOT NULL DEFAULT 0,   -- Ordre d'affichage dans le profil
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Une seule variable avec cette key par profil
  UNIQUE(profile_id, key)
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_job_profile_variables_profile ON job_profile_variables(profile_id);
CREATE INDEX idx_job_profile_variables_position ON job_profile_variables(profile_id, position);

-- Trigger updated_at
CREATE TRIGGER update_job_profile_variables_updated_at
  BEFORE UPDATE ON job_profile_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Contraintes additionnelles
-- ----------------------------------------------------------------------------

-- Max 5 variables par profil (soft constraint via application, hard via trigger)
CREATE OR REPLACE FUNCTION check_max_variables_per_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM job_profile_variables WHERE profile_id = NEW.profile_id) >= 5 THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Un profil métier ne peut pas avoir plus de 5 variables suggérées';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_variables
  BEFORE INSERT ON job_profile_variables
  FOR EACH ROW
  EXECUTE FUNCTION check_max_variables_per_profile();

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

ALTER TABLE job_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_profile_variables ENABLE ROW LEVEL SECURITY;

-- Lecture publique (données système)
CREATE POLICY "job_profiles_read_all" ON job_profiles
  FOR SELECT USING (true);

CREATE POLICY "job_profile_variables_read_all" ON job_profile_variables
  FOR SELECT USING (true);

-- Écriture réservée aux admins (via service role ou fonction admin)
-- Pour l'instant, pas de policy d'écriture = seul service role peut écrire

-- ----------------------------------------------------------------------------
-- Commentaires de documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE job_profiles IS 'Profils métiers avec variables suggérées pour les propositions';
COMMENT ON TABLE job_profile_variables IS 'Variables suggérées par profil métier (max 5 par profil)';
COMMENT ON COLUMN job_profile_variables.required_suggestion IS 'Indique si cette variable est particulièrement importante pour ce métier';
COMMENT ON COLUMN job_profile_variables.options IS 'Options disponibles pour le type select (JSON array)';
