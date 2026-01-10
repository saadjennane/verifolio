-- Migration 022: Système Badges & Tags transversal
-- Badges = peu nombreux, visuels, contexte automatique ou manuel
-- Tags = libres, nombreux, user-scoped

-- Table centralisée des badges prédéfinis
CREATE TABLE badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'gray',
  description TEXT,
  auto_trigger TEXT, -- 'urgent_date', 'review_needed', null (manual)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insérer les badges prédéfinis
INSERT INTO badge_definitions (code, label, variant, description, auto_trigger) VALUES
  ('urgent', 'URGENT', 'red', 'Deal/Mission urgent (date proche ou manuel)', 'urgent_date'),
  ('vip', 'VIP', 'yellow', 'Client VIP (manuel uniquement)', null),
  ('review', 'REVIEW', 'blue', 'Modifications demandées après envoi (auto SENT → DRAFT)', 'review_needed');

-- Fonction pour calculer le badge URGENT basé sur les dates
CREATE OR REPLACE FUNCTION should_have_urgent_badge(entity_type TEXT, entity_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_urgent BOOLEAN := false;
  v_sent_at TIMESTAMPTZ;
  v_date_echeance DATE;
BEGIN
  IF entity_type = 'deal' THEN
    SELECT sent_at INTO v_sent_at
    FROM deals
    WHERE id = entity_id;

    -- Deal est urgent si envoyé il y a plus de 7 jours sans réponse
    IF v_sent_at IS NOT NULL AND v_sent_at < now() - INTERVAL '7 days' THEN
      v_urgent := true;
    END IF;

  ELSIF entity_type = 'mission' THEN
    -- Mission urgente si une facture a une échéance dans moins de 7 jours
    SELECT MIN(i.date_echeance) INTO v_date_echeance
    FROM mission_invoices mi
    JOIN invoices i ON i.id = mi.invoice_id
    WHERE mi.mission_id = entity_id
    AND i.status IN ('envoyee', 'sent')
    AND i.date_echeance IS NOT NULL;

    IF v_date_echeance IS NOT NULL AND v_date_echeance <= CURRENT_DATE + INTERVAL '7 days' THEN
      v_urgent := true;
    END IF;
  END IF;

  RETURN v_urgent;
END;
$$ LANGUAGE plpgsql;

-- Vue unifiée des badges pour tous les types d'entités
-- Permet de requêter facilement les badges d'un deal, mission, etc.
CREATE VIEW entity_badges AS
  SELECT
    'deal' as entity_type,
    db.deal_id as entity_id,
    db.badge,
    db.variant,
    bd.code as badge_code,
    bd.auto_trigger
  FROM deal_badges db
  LEFT JOIN badge_definitions bd ON bd.label = db.badge

  UNION ALL

  SELECT
    'mission' as entity_type,
    mb.mission_id as entity_id,
    mb.badge,
    mb.variant,
    bd.code as badge_code,
    bd.auto_trigger
  FROM mission_badges mb
  LEFT JOIN badge_definitions bd ON bd.label = mb.badge;

-- Vue unifiée des tags
CREATE VIEW entity_tags AS
  SELECT
    'deal' as entity_type,
    dt.deal_id as entity_id,
    dt.tag,
    dt.color,
    dt.created_at
  FROM deal_tags dt

  UNION ALL

  SELECT
    'mission' as entity_type,
    mt.mission_id as entity_id,
    mt.tag,
    mt.color,
    mt.created_at
  FROM mission_tags mt;

-- Table pour tags utilisateur (suggestions/autocomplete)
-- Stocke les tags uniques utilisés par chaque utilisateur
CREATE TABLE user_tag_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_tag UNIQUE (user_id, tag)
);

CREATE INDEX idx_user_tag_library_user_id ON user_tag_library(user_id);
CREATE INDEX idx_user_tag_library_tag ON user_tag_library(tag);

ALTER TABLE user_tag_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_tag_library_user_policy ON user_tag_library
  FOR ALL
  USING (auth.uid() = user_id);

-- Fonction pour auto-incrémenter usage_count dans user_tag_library
CREATE OR REPLACE FUNCTION update_user_tag_library()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer ou mettre à jour le tag dans la bibliothèque utilisateur
  INSERT INTO user_tag_library (user_id, tag, color, usage_count, last_used_at)
  SELECT
    CASE TG_TABLE_NAME
      WHEN 'deal_tags' THEN (SELECT user_id FROM deals WHERE id = NEW.deal_id)
      WHEN 'mission_tags' THEN (SELECT user_id FROM missions WHERE id = NEW.mission_id)
    END,
    NEW.tag,
    NEW.color,
    1,
    now()
  ON CONFLICT (user_id, tag)
  DO UPDATE SET
    usage_count = user_tag_library.usage_count + 1,
    last_used_at = now(),
    color = EXCLUDED.color;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour user_tag_library
CREATE TRIGGER deal_tags_update_library
  AFTER INSERT ON deal_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tag_library();

CREATE TRIGGER mission_tags_update_library
  AFTER INSERT ON mission_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tag_library();

-- Note: Pour supprimer un tag de la bibliothèque, il faudrait un mécanisme
-- de nettoyage périodique ou un compteur qui décrémente, mais pour v1
-- on garde simple : une fois ajouté, il reste dans les suggestions
