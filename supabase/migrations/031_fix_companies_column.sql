-- ============================================================================
-- Migration 031: Fix companies table - remove obsolete 'nom' column
-- ============================================================================

-- La colonne 'nom' était dans la migration 001 mais a été remplacée par
-- 'display_name' dans la migration 003. On supprime 'nom' pour éviter la confusion.

ALTER TABLE companies DROP COLUMN IF EXISTS nom;
