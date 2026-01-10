-- Migration 027: Ajout de display_order pour réordonner les tags et badges

-- Ajouter display_order aux tags de deals
ALTER TABLE deal_tags
  ADD COLUMN display_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_deal_tags_display_order ON deal_tags(deal_id, display_order);

-- Ajouter display_order aux badges de deals
ALTER TABLE deal_badges
  ADD COLUMN display_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_deal_badges_display_order ON deal_badges(deal_id, display_order);

-- Ajouter display_order aux tags de missions
ALTER TABLE mission_tags
  ADD COLUMN display_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_mission_tags_display_order ON mission_tags(mission_id, display_order);

-- Ajouter display_order aux badges de missions
ALTER TABLE mission_badges
  ADD COLUMN display_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_mission_badges_display_order ON mission_badges(mission_id, display_order);

-- Fonction pour réordonner les tags d'un deal
CREATE OR REPLACE FUNCTION reorder_deal_tags(
  p_deal_id UUID,
  p_tag_orders JSONB -- [{"tag": "tag1", "order": 0}, {"tag": "tag2", "order": 1}, ...]
)
RETURNS void AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_tag_orders)
  LOOP
    UPDATE deal_tags
    SET display_order = (v_item->>'order')::INT
    WHERE deal_id = p_deal_id
      AND tag = (v_item->>'tag');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réordonner les badges d'un deal
CREATE OR REPLACE FUNCTION reorder_deal_badges(
  p_deal_id UUID,
  p_badge_orders JSONB -- [{"badge": "badge1", "order": 0}, {"badge": "badge2", "order": 1}, ...]
)
RETURNS void AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_badge_orders)
  LOOP
    UPDATE deal_badges
    SET display_order = (v_item->>'order')::INT
    WHERE deal_id = p_deal_id
      AND badge = (v_item->>'badge');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réordonner les tags d'une mission
CREATE OR REPLACE FUNCTION reorder_mission_tags(
  p_mission_id UUID,
  p_tag_orders JSONB
)
RETURNS void AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_tag_orders)
  LOOP
    UPDATE mission_tags
    SET display_order = (v_item->>'order')::INT
    WHERE mission_id = p_mission_id
      AND tag = (v_item->>'tag');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réordonner les badges d'une mission
CREATE OR REPLACE FUNCTION reorder_mission_badges(
  p_mission_id UUID,
  p_badge_orders JSONB
)
RETURNS void AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_badge_orders)
  LOOP
    UPDATE mission_badges
    SET display_order = (v_item->>'order')::INT
    WHERE mission_id = p_mission_id
      AND badge = (v_item->>'badge');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour assigner automatiquement le prochain display_order lors de l'insertion
CREATE OR REPLACE FUNCTION assign_next_display_order_deal_tags()
RETURNS TRIGGER AS $$
DECLARE
  v_max_order INT;
BEGIN
  IF NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_max_order
    FROM deal_tags
    WHERE deal_id = NEW.deal_id;

    NEW.display_order = v_max_order;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_deal_tags_order
  BEFORE INSERT ON deal_tags
  FOR EACH ROW
  EXECUTE FUNCTION assign_next_display_order_deal_tags();

CREATE OR REPLACE FUNCTION assign_next_display_order_deal_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_max_order INT;
BEGIN
  IF NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_max_order
    FROM deal_badges
    WHERE deal_id = NEW.deal_id;

    NEW.display_order = v_max_order;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_deal_badges_order
  BEFORE INSERT ON deal_badges
  FOR EACH ROW
  EXECUTE FUNCTION assign_next_display_order_deal_badges();

CREATE OR REPLACE FUNCTION assign_next_display_order_mission_tags()
RETURNS TRIGGER AS $$
DECLARE
  v_max_order INT;
BEGIN
  IF NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_max_order
    FROM mission_tags
    WHERE mission_id = NEW.mission_id;

    NEW.display_order = v_max_order;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_mission_tags_order
  BEFORE INSERT ON mission_tags
  FOR EACH ROW
  EXECUTE FUNCTION assign_next_display_order_mission_tags();

CREATE OR REPLACE FUNCTION assign_next_display_order_mission_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_max_order INT;
BEGIN
  IF NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_max_order
    FROM mission_badges
    WHERE mission_id = NEW.mission_id;

    NEW.display_order = v_max_order;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_mission_badges_order
  BEFORE INSERT ON mission_badges
  FOR EACH ROW
  EXECUTE FUNCTION assign_next_display_order_mission_badges();

COMMENT ON FUNCTION reorder_deal_tags IS 'Réordonne les tags d''un deal';
COMMENT ON FUNCTION reorder_deal_badges IS 'Réordonne les badges d''un deal';
COMMENT ON FUNCTION reorder_mission_tags IS 'Réordonne les tags d''une mission';
COMMENT ON FUNCTION reorder_mission_badges IS 'Réordonne les badges d''une mission';
