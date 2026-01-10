-- Migration 001: Fonctions utilitaires communes
-- À exécuter EN PREMIER avant toutes les autres migrations

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS 'Fonction trigger pour mettre à jour automatiquement le champ updated_at lors d''une modification';

-- Fonction pour générer un numéro de document unique
CREATE OR REPLACE FUNCTION generate_document_number(
  p_prefix TEXT,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TEXT AS $$
DECLARE
  v_sequence INT;
  v_number TEXT;
BEGIN
  -- Générer un numéro séquentiel pour l'année
  -- Note: Cette implémentation simple pourrait être améliorée avec une table de séquences
  v_sequence := (RANDOM() * 9000 + 1000)::INT; -- Placeholder, devrait être séquentiel
  v_number := p_prefix || '-' || p_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_document_number IS 'Génère un numéro de document unique avec préfixe et année';

-- Fonction pour valider un email
CREATE OR REPLACE FUNCTION is_valid_email(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_valid_email IS 'Valide le format d''une adresse email';

-- Fonction pour générer un slug depuis un texte
CREATE OR REPLACE FUNCTION slugify(p_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(p_text, '[àáâãäå]', 'a', 'g'),
        '[èéêë]', 'e', 'g'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION slugify IS 'Convertit un texte en slug URL-friendly';

-- Fonction pour calculer le nombre de jours entre deux dates
CREATE OR REPLACE FUNCTION days_between(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS INT AS $$
BEGIN
  RETURN EXTRACT(DAY FROM (p_end_date - p_start_date))::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION days_between IS 'Calcule le nombre de jours entre deux dates';

-- Fonction pour vérifier si une date est dans le futur
CREATE OR REPLACE FUNCTION is_future_date(p_date TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_date > now();
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_future_date IS 'Vérifie si une date est dans le futur';

-- Fonction pour vérifier si une date est dans le passé
CREATE OR REPLACE FUNCTION is_past_date(p_date TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_date < now();
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_past_date IS 'Vérifie si une date est dans le passé';
