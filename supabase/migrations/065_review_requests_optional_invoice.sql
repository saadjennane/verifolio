-- Migration 065: Review Requests - Invoice optionnel
-- Permet de créer des demandes de review sans facture associée

-- 1. Rendre invoice_id nullable dans review_requests
ALTER TABLE review_requests
  ALTER COLUMN invoice_id DROP NOT NULL;

-- 2. Supprimer la contrainte unique_request_per_invoice qui nécessite invoice_id
ALTER TABLE review_requests
  DROP CONSTRAINT IF EXISTS unique_request_per_invoice;

-- 3. Créer une nouvelle contrainte qui permet plusieurs requests par mission sans invoice
-- (ou une par invoice si invoice_id est spécifié)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_request_per_invoice
  ON review_requests(user_id, invoice_id)
  WHERE invoice_id IS NOT NULL;

-- 4. Rendre invoice_id nullable aussi dans reviews (pour les reviews liées à une mission sans facture)
ALTER TABLE reviews
  ALTER COLUMN invoice_id DROP NOT NULL;

-- 5. Commenter les changements
COMMENT ON COLUMN review_requests.invoice_id IS 'Facture associée (optionnel). Si NULL, la review request est liée directement à une mission.';
COMMENT ON COLUMN review_requests.mission_id IS 'Mission associée (recommandé). Peut être rempli automatiquement depuis invoice_id.';
