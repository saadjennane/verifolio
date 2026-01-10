-- Migration 041: Ajouter wait_reason aux tasks
-- Ajoute un champ optionnel pour documenter la raison d'attente

-- =============================================================================
-- 1. AJOUTER LA COLONNE wait_reason
-- =============================================================================

-- Ajouter la colonne wait_reason (nullable, courte string)
ALTER TABLE tasks ADD COLUMN wait_reason TEXT;

-- Commentaire pour documenter l'usage
COMMENT ON COLUMN tasks.wait_reason IS 'Raison d''attente optionnelle, pertinente uniquement quand status = en_attente. Conservée en historique même si status change.';

-- Note: Pas de constraint CHECK car on veut conserver la valeur en historique
-- même si le statut change. La validation se fait côté API.
