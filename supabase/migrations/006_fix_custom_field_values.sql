-- Migration: 006_fix_custom_field_values.sql
-- Description: Fix custom_field_values to handle upsert properly
-- Date: 2025-12-23

-- Supprimer les valeurs orphelines ou avec user_id null
DELETE FROM custom_field_values WHERE user_id IS NULL;

-- Ajouter user_id à la contrainte unique pour éviter les conflits entre utilisateurs
-- D'abord supprimer l'ancienne contrainte
ALTER TABLE custom_field_values DROP CONSTRAINT IF EXISTS custom_field_values_unique;

-- Créer la nouvelle contrainte qui inclut user_id
ALTER TABLE custom_field_values ADD CONSTRAINT custom_field_values_unique
  UNIQUE (user_id, field_id, entity_type, entity_id);
