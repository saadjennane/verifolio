-- Migration: 005_disable_rls_settings.sql
-- TEMPORAIRE: Désactive RLS pour les tables settings en développement
-- À SUPPRIMER avant la mise en production!

-- Désactiver RLS sur les tables settings
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_blocks DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques restrictives
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

DROP POLICY IF EXISTS "custom_fields_select" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_insert" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_update" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_delete" ON custom_fields;

DROP POLICY IF EXISTS "custom_field_values_select" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_insert" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_update" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_delete" ON custom_field_values;

DROP POLICY IF EXISTS "templates_select" ON templates;
DROP POLICY IF EXISTS "templates_insert" ON templates;
DROP POLICY IF EXISTS "templates_update" ON templates;
DROP POLICY IF EXISTS "templates_delete" ON templates;

DROP POLICY IF EXISTS "template_blocks_select" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_insert" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_update" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_delete" ON template_blocks;

-- Rendre user_id nullable temporairement pour permettre les insertions sans auth
ALTER TABLE companies ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE custom_fields ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE custom_field_values ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE templates ALTER COLUMN user_id DROP NOT NULL;
