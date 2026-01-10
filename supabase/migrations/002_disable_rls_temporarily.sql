-- Migration: 002_disable_rls_temporarily.sql
-- TEMPORAIRE: Désactive RLS pour le développement
-- À SUPPRIMER avant la mise en production!

-- Désactiver RLS sur toutes les tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items DISABLE ROW LEVEL SECURITY;

-- Rendre user_id nullable temporairement pour permettre les insertions sans auth
ALTER TABLE companies ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE quotes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;

-- Créer un user_id par défaut pour le développement (UUID fixe)
-- Vous pouvez utiliser cette valeur dans vos insertions
-- DEFAULT_DEV_USER_ID: 00000000-0000-0000-0000-000000000000
