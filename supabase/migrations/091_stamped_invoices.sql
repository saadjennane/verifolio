-- ============================================================================
-- Migration 091: Stamped Invoice Documents
-- Permet d'ajouter une facture cachetee (PDF/scan signe) sans modifier le statut
-- ============================================================================

-- Ajouter colonne pour stocker l'URL du document cachete
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stamped_document_url TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN invoices.stamped_document_url IS
  'URL du document cachete/signe uploade par l''utilisateur (stocke dans bucket verifolio-docs). Ce champ est purement informatif et ne modifie pas le statut de la facture.';

-- Note: Pas d'index necessaire car cette colonne n'est pas utilisee pour le filtrage
-- Note: Pas de trigger - le badge "Cachetee" depend uniquement de la presence de cette URL
