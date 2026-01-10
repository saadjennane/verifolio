-- Migration 023: Ajout des tags suggérés pour review requests
-- Les tags de la mission sont proposés lors de la création de review requests

ALTER TABLE review_requests
  ADD COLUMN suggested_tags JSONB DEFAULT '[]'::jsonb;

-- Fonction pour récupérer les tags d'une mission via une facture
CREATE OR REPLACE FUNCTION get_mission_tags_for_invoice(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tags JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('tag', mt.tag, 'color', mt.color))
  INTO v_tags
  FROM mission_invoices mi
  JOIN mission_tags mt ON mt.mission_id = mi.mission_id
  WHERE mi.invoice_id = p_invoice_id;

  RETURN COALESCE(v_tags, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
