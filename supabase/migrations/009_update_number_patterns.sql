-- Migration: 009_update_number_patterns.sql
-- Description: Met à jour les patterns de numérotation vers le nouveau format avec {SEQ:n}
-- Date: 2025-12-24

-- Mettre à jour le pattern par défaut pour les nouvelles entrées
ALTER TABLE companies
  ALTER COLUMN invoice_number_pattern SET DEFAULT 'FA-{SEQ:3}-{YY}',
  ALTER COLUMN quote_number_pattern SET DEFAULT 'DEV-{SEQ:3}-{YY}';

-- Convertir les anciens patterns existants vers le nouveau format
-- {0000} → {SEQ:4}
-- {000} → {SEQ:3}
-- etc.

UPDATE companies
SET invoice_number_pattern = REGEXP_REPLACE(
  invoice_number_pattern,
  '\{(0+)\}',
  '{SEQ:' || LENGTH(SUBSTRING(invoice_number_pattern FROM '\{(0+)\}')) || '}',
  'g'
)
WHERE invoice_number_pattern ~ '\{0+\}';

UPDATE companies
SET quote_number_pattern = REGEXP_REPLACE(
  quote_number_pattern,
  '\{(0+)\}',
  '{SEQ:' || LENGTH(SUBSTRING(quote_number_pattern FROM '\{(0+)\}')) || '}',
  'g'
)
WHERE quote_number_pattern ~ '\{0+\}';

-- Note: Les utilisateurs avec patterns personnalisés devront les mettre à jour manuellement
-- si ils utilisent un format non standard
