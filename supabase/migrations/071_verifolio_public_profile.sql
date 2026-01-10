-- ============================================================================
-- Migration 071: Verifolio Public Profile
-- Page publique "Mon Verifolio" pour les freelances
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: verifolio_profiles (profil public du freelance)
-- ----------------------------------------------------------------------------

CREATE TABLE verifolio_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- URL publique
  slug TEXT NOT NULL UNIQUE,

  -- Statut de publication
  is_published BOOLEAN NOT NULL DEFAULT false,

  -- Header
  photo_url TEXT,                          -- Photo ou logo
  display_name TEXT NOT NULL,              -- Nom affiché
  title TEXT,                              -- Titre principal (ex: "Mentaliste & consultant innovation")
  bio TEXT,                                -- Mini-bio (max 2 lignes)

  -- CTAs (max 2)
  cta1_label TEXT,                         -- Label du CTA 1
  cta1_url TEXT,                           -- URL du CTA 1
  cta2_label TEXT,                         -- Label du CTA 2
  cta2_url TEXT,                           -- URL du CTA 2

  -- Sections activées
  show_activities BOOLEAN NOT NULL DEFAULT true,
  show_reviews BOOLEAN NOT NULL DEFAULT true,

  -- Filtres avis (V1)
  reviews_min_rating INTEGER CHECK (reviews_min_rating IS NULL OR (reviews_min_rating >= 1 AND reviews_min_rating <= 5)),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_verifolio_profiles_slug ON verifolio_profiles(slug);
CREATE INDEX idx_verifolio_profiles_published ON verifolio_profiles(is_published) WHERE is_published = true;

-- Trigger updated_at
CREATE TRIGGER update_verifolio_profiles_updated_at
  BEFORE UPDATE ON verifolio_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE verifolio_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les profils publiés (page publique)
CREATE POLICY "verifolio_profiles_public_read" ON verifolio_profiles
  FOR SELECT USING (is_published = true);

-- Gestion complète pour le propriétaire
CREATE POLICY "verifolio_profiles_owner_all" ON verifolio_profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Table: verifolio_activities (activités affichées sur la page publique)
-- ----------------------------------------------------------------------------

CREATE TABLE verifolio_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES verifolio_profiles(id) ON DELETE CASCADE,

  -- Lien optionnel vers user_activity existante
  user_activity_id UUID REFERENCES user_activities(id) ON DELETE SET NULL,

  -- Contenu
  title TEXT NOT NULL,
  description TEXT,                        -- 1-2 phrases max
  image_url TEXT,                          -- Illustration (image ou icône URL)

  -- Ordre et visibilité
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_verifolio_activities_profile ON verifolio_activities(profile_id);
CREATE INDEX idx_verifolio_activities_order ON verifolio_activities(profile_id, sort_order);

-- Trigger updated_at
CREATE TRIGGER update_verifolio_activities_updated_at
  BEFORE UPDATE ON verifolio_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE verifolio_activities ENABLE ROW LEVEL SECURITY;

-- Lecture publique via profil publié
CREATE POLICY "verifolio_activities_public_read" ON verifolio_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM verifolio_profiles
      WHERE verifolio_profiles.id = verifolio_activities.profile_id
      AND verifolio_profiles.is_published = true
    )
  );

-- Gestion complète pour le propriétaire
CREATE POLICY "verifolio_activities_owner_all" ON verifolio_activities
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Table: verifolio_review_selections (avis sélectionnés pour affichage)
-- Permet de choisir quels avis afficher et dans quel ordre
-- ----------------------------------------------------------------------------

CREATE TABLE verifolio_review_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES verifolio_profiles(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

  -- Filtrage optionnel par activité
  activity_id UUID REFERENCES verifolio_activities(id) ON DELETE SET NULL,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Une review unique par profil
  CONSTRAINT unique_review_per_profile UNIQUE (profile_id, review_id)
);

-- Index
CREATE INDEX idx_verifolio_review_selections_profile ON verifolio_review_selections(profile_id, sort_order);
CREATE INDEX idx_verifolio_review_selections_activity ON verifolio_review_selections(activity_id);

-- RLS
ALTER TABLE verifolio_review_selections ENABLE ROW LEVEL SECURITY;

-- Lecture publique via profil publié
CREATE POLICY "verifolio_review_selections_public_read" ON verifolio_review_selections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM verifolio_profiles
      WHERE verifolio_profiles.id = verifolio_review_selections.profile_id
      AND verifolio_profiles.is_published = true
    )
  );

-- Gestion complète pour le propriétaire (via le profil)
CREATE POLICY "verifolio_review_selections_owner_all" ON verifolio_review_selections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM verifolio_profiles
      WHERE verifolio_profiles.id = verifolio_review_selections.profile_id
      AND verifolio_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM verifolio_profiles
      WHERE verifolio_profiles.id = verifolio_review_selections.profile_id
      AND verifolio_profiles.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Fonction: Générer un slug unique
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_verifolio_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Normaliser le nom en slug
  base_slug := lower(regexp_replace(
    regexp_replace(
      unaccent(base_name),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  ));

  -- Limiter la longueur
  base_slug := left(base_slug, 50);

  -- Chercher un slug unique
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM verifolio_profiles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Commentaires
-- ----------------------------------------------------------------------------

COMMENT ON TABLE verifolio_profiles IS 'Profils publics Verifolio des freelances';
COMMENT ON TABLE verifolio_activities IS 'Activités affichées sur la page publique Verifolio';
COMMENT ON TABLE verifolio_review_selections IS 'Sélection des avis à afficher sur Verifolio';

COMMENT ON COLUMN verifolio_profiles.slug IS 'URL publique unique (ex: jean-dupont)';
COMMENT ON COLUMN verifolio_profiles.cta1_label IS 'Label du premier CTA (ex: Me contacter)';
COMMENT ON COLUMN verifolio_profiles.cta1_url IS 'URL du premier CTA (ex: mailto:, https://)';
COMMENT ON COLUMN verifolio_profiles.reviews_min_rating IS 'Note minimum pour afficher un avis (1-5)';

COMMENT ON COLUMN verifolio_activities.user_activity_id IS 'Lien optionnel vers user_activities pour cohérence';
COMMENT ON COLUMN verifolio_activities.image_url IS 'URL image ou icône illustrant l''activité';
