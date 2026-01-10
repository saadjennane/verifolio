-- Migration 025: Reviews centrées sur les Missions
-- Correction de la structure pour aligner avec la philosophie Verifolio

-- 1. Le contexte (texte + médias) est au niveau de la Mission
-- Ajouter mission_context à la table missions
ALTER TABLE missions
  ADD COLUMN mission_context TEXT;

-- 2. Modifier review_mission_media pour être vraiment lié à la mission
-- (actuellement lié à invoice_id, on corrige)
ALTER TABLE review_mission_media
  DROP CONSTRAINT IF EXISTS review_mission_media_invoice_id_fkey,
  ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE CASCADE;

-- Créer l'index
CREATE INDEX idx_review_mission_media_mission_id ON review_mission_media(mission_id);

-- Note: On garde invoice_id pour compatibilité backward mais mission_id devient la référence principale

-- 3. Ajouter mission_id aux review_requests (en plus de invoice_id)
ALTER TABLE review_requests
  ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE CASCADE;

CREATE INDEX idx_review_requests_mission_id ON review_requests(mission_id);

-- 4. Ajouter mission_id aux reviews
ALTER TABLE reviews
  ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE CASCADE;

CREATE INDEX idx_reviews_mission_id ON reviews(mission_id);

-- 5. Fonction pour vérifier qu'une mission peut être affichée sur Verifolio
CREATE OR REPLACE FUNCTION mission_can_be_displayed_on_verifolio(p_mission_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_mission RECORD;
  v_published_reviews_count INTEGER;
BEGIN
  -- Récupérer la mission
  SELECT * INTO v_mission
  FROM missions
  WHERE id = p_mission_id;

  IF v_mission IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier que visible_on_verifolio = true
  IF NOT v_mission.visible_on_verifolio THEN
    RETURN false;
  END IF;

  -- Vérifier qu'il y a un contexte minimum
  IF v_mission.mission_context IS NULL OR LENGTH(TRIM(v_mission.mission_context)) < 50 THEN
    RETURN false;
  END IF;

  -- Vérifier qu'il y a au moins une review publiée
  SELECT COUNT(*) INTO v_published_reviews_count
  FROM reviews
  WHERE mission_id = p_mission_id
    AND is_published = true;

  IF v_published_reviews_count = 0 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Vue pour les missions affichables sur Verifolio
CREATE OR REPLACE VIEW verifolio_missions AS
SELECT
  m.*,
  c.nom as client_nom,
  COUNT(r.id) as published_reviews_count
FROM missions m
JOIN clients c ON c.id = m.client_id
LEFT JOIN reviews r ON r.mission_id = m.id AND r.is_published = true
WHERE m.visible_on_verifolio = true
  AND m.mission_context IS NOT NULL
  AND LENGTH(TRIM(m.mission_context)) >= 50
GROUP BY m.id, c.nom
HAVING COUNT(r.id) > 0
ORDER BY m.created_at DESC;

-- 7. Fonction pour créer une review request (validation stricte)
CREATE OR REPLACE FUNCTION validate_review_request_creation(p_invoice_id UUID)
RETURNS TABLE (
  valid BOOLEAN,
  error_message TEXT,
  mission_id UUID
) AS $$
DECLARE
  v_invoice RECORD;
  v_mission_id UUID;
BEGIN
  -- Vérifier que la facture existe et est envoyée
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;

  IF v_invoice IS NULL THEN
    RETURN QUERY SELECT false, 'Facture introuvable', NULL::UUID;
    RETURN;
  END IF;

  IF v_invoice.status NOT IN ('sent', 'envoyee') THEN
    RETURN QUERY SELECT false, 'La facture doit être envoyée (status: sent)', NULL::UUID;
    RETURN;
  END IF;

  -- Récupérer la mission liée
  SELECT mi.mission_id INTO v_mission_id
  FROM mission_invoices mi
  WHERE mi.invoice_id = p_invoice_id
  LIMIT 1;

  IF v_mission_id IS NULL THEN
    RETURN QUERY SELECT false, 'La facture doit être liée à une mission', NULL::UUID;
    RETURN;
  END IF;

  -- Tout est OK
  RETURN QUERY SELECT true, NULL::TEXT, v_mission_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger pour auto-remplir mission_id lors de création review_request
CREATE OR REPLACE FUNCTION auto_fill_mission_id_review_request()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_id UUID;
BEGIN
  IF NEW.mission_id IS NULL AND NEW.invoice_id IS NOT NULL THEN
    -- Récupérer mission_id depuis invoice
    SELECT mi.mission_id INTO v_mission_id
    FROM mission_invoices mi
    WHERE mi.invoice_id = NEW.invoice_id
    LIMIT 1;

    NEW.mission_id = v_mission_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_request_auto_fill_mission
  BEFORE INSERT ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_mission_id_review_request();

-- 9. Trigger pour auto-remplir mission_id lors de création review
CREATE OR REPLACE FUNCTION auto_fill_mission_id_review()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_id UUID;
BEGIN
  IF NEW.mission_id IS NULL THEN
    -- Récupérer mission_id depuis review_request
    SELECT rr.mission_id INTO v_mission_id
    FROM review_requests rr
    WHERE rr.id = NEW.review_request_id;

    NEW.mission_id = v_mission_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_auto_fill_mission
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_mission_id_review();
