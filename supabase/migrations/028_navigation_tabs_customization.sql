-- Migration 028: Personnalisation de l'ordre des onglets de navigation

-- Table pour stocker l'ordre personnalisé des tabs par utilisateur
CREATE TABLE user_navigation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL, -- 'deals', 'missions', 'clients', 'contacts', 'invoices', 'quotes', 'reviews', 'proposals', 'documents', 'todos'
  display_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_tab UNIQUE (user_id, tab_key)
);

CREATE INDEX idx_user_navigation_user_id ON user_navigation_preferences(user_id);
CREATE INDEX idx_user_navigation_order ON user_navigation_preferences(user_id, display_order);

-- RLS
ALTER TABLE user_navigation_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own navigation preferences"
  ON user_navigation_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER user_navigation_preferences_updated_at
  BEFORE UPDATE ON user_navigation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Fonction pour initialiser les préférences par défaut d'un utilisateur
CREATE OR REPLACE FUNCTION initialize_user_navigation_preferences(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Ordre par défaut
  INSERT INTO user_navigation_preferences (user_id, tab_key, display_order, is_visible) VALUES
    (p_user_id, 'deals', 0, true),
    (p_user_id, 'missions', 1, true),
    (p_user_id, 'clients', 2, true),
    (p_user_id, 'contacts', 3, true),
    (p_user_id, 'invoices', 4, true),
    (p_user_id, 'quotes', 5, true),
    (p_user_id, 'proposals', 6, true),
    (p_user_id, 'reviews', 7, true),
    (p_user_id, 'documents', 8, true),
    (p_user_id, 'todos', 9, true)
  ON CONFLICT (user_id, tab_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réordonner les tabs
CREATE OR REPLACE FUNCTION reorder_navigation_tabs(
  p_user_id UUID,
  p_tab_orders JSONB -- [{"tab_key": "deals", "order": 0}, {"tab_key": "missions", "order": 1}, ...]
)
RETURNS void AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_tab_orders)
  LOOP
    UPDATE user_navigation_preferences
    SET display_order = (v_item->>'order')::INT
    WHERE user_id = p_user_id
      AND tab_key = (v_item->>'tab_key');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour toggle la visibilité d'un tab
CREATE OR REPLACE FUNCTION toggle_navigation_tab_visibility(
  p_user_id UUID,
  p_tab_key TEXT,
  p_is_visible BOOLEAN
)
RETURNS void AS $$
BEGIN
  UPDATE user_navigation_preferences
  SET is_visible = p_is_visible
  WHERE user_id = p_user_id
    AND tab_key = p_tab_key;
END;
$$ LANGUAGE plpgsql;

-- Vue pour récupérer facilement la navigation personnalisée
CREATE VIEW user_navigation_view AS
SELECT
  unp.user_id,
  unp.tab_key,
  unp.display_order,
  unp.is_visible,
  CASE unp.tab_key
    WHEN 'deals' THEN 'Deals'
    WHEN 'missions' THEN 'Missions'
    WHEN 'clients' THEN 'Clients'
    WHEN 'contacts' THEN 'Contacts'
    WHEN 'invoices' THEN 'Factures'
    WHEN 'quotes' THEN 'Devis'
    WHEN 'proposals' THEN 'Propositions'
    WHEN 'reviews' THEN 'Avis'
    WHEN 'documents' THEN 'Documents'
    WHEN 'todos' THEN 'Tâches'
    ELSE unp.tab_key
  END as label,
  CASE unp.tab_key
    WHEN 'deals' THEN '/deals'
    WHEN 'missions' THEN '/missions'
    WHEN 'clients' THEN '/clients'
    WHEN 'contacts' THEN '/contacts'
    WHEN 'invoices' THEN '/invoices'
    WHEN 'quotes' THEN '/quotes'
    WHEN 'proposals' THEN '/proposals/templates'
    WHEN 'reviews' THEN '/reviews'
    WHEN 'documents' THEN '/documents'
    WHEN 'todos' THEN '/todos'
    ELSE '/'
  END as path
FROM user_navigation_preferences unp
ORDER BY unp.display_order;

COMMENT ON TABLE user_navigation_preferences IS 'Préférences de navigation personnalisées par utilisateur (ordre et visibilité des onglets)';
COMMENT ON FUNCTION initialize_user_navigation_preferences IS 'Initialise les préférences de navigation par défaut pour un nouvel utilisateur';
COMMENT ON FUNCTION reorder_navigation_tabs IS 'Réordonne les onglets de navigation';
COMMENT ON FUNCTION toggle_navigation_tab_visibility IS 'Active/désactive la visibilité d''un onglet';
