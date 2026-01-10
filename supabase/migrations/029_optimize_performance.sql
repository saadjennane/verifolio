-- ============================================================================
-- Migration 029: Optimisations de performance
-- ============================================================================

-- Index pour améliorer les performances des requêtes de liste
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_nom_lower ON contacts(user_id, LOWER(nom));

-- Index composite pour la requête de contacts avec client_links
CREATE INDEX IF NOT EXISTS idx_client_contacts_contact_client ON client_contacts(contact_id, client_id);

-- Si la vue client_balances existe, la recréer avec une meilleure performance
DROP VIEW IF EXISTS client_balances CASCADE;

CREATE VIEW client_balances AS
SELECT
  c.id AS client_id,
  c.user_id,
  c.nom,
  COALESCE(SUM(i.total_ttc), 0) AS total_facture,
  COALESCE(SUM(CASE WHEN i.status = 'payee' THEN i.total_ttc ELSE 0 END), 0) AS total_paye,
  COALESCE(SUM(CASE WHEN i.status != 'payee' THEN i.total_ttc ELSE 0 END), 0) AS total_restant
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id
GROUP BY c.id, c.user_id, c.nom;

-- Index pour améliorer les performances de la vue
CREATE INDEX IF NOT EXISTS idx_invoices_balance_lookup
  ON invoices(client_id, status, total_ttc)
  WHERE client_id IS NOT NULL;

-- Analyser les tables pour mettre à jour les statistiques
ANALYZE clients;
ANALYZE contacts;
ANALYZE client_contacts;
ANALYZE invoices;
