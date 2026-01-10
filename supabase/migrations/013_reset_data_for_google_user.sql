-- Migration 013: Reset data and assign to Google user
-- Votre user_id Google: 92cc45b0-7be7-4c1a-84af-4151fc460563

-- Supprimer toutes les données existantes
DELETE FROM invoice_line_items;
DELETE FROM quote_line_items;
DELETE FROM invoices;
DELETE FROM quotes;
DELETE FROM clients;
DELETE FROM custom_field_values;
DELETE FROM custom_fields;
DELETE FROM template_blocks;
DELETE FROM companies WHERE user_id != '92cc45b0-7be7-4c1a-84af-4151fc460563';

-- Garder uniquement la company de votre compte Google
-- (déjà créée lors de la connexion OAuth)
