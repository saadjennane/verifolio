-- Migration: 007_remove_fk_for_dev.sql
-- Description: Remove foreign key constraints for development mode
-- Date: 2025-12-23

-- Remove FK constraint on companies.user_id
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey;

-- Remove FK constraint on clients.user_id
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

-- Remove FK constraint on quotes.user_id
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;

-- Remove FK constraint on invoices.user_id
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;

-- Remove FK constraint on custom_fields.user_id
ALTER TABLE custom_fields DROP CONSTRAINT IF EXISTS custom_fields_user_id_fkey;

-- Remove FK constraint on custom_field_values.user_id
ALTER TABLE custom_field_values DROP CONSTRAINT IF EXISTS custom_field_values_user_id_fkey;

-- Remove FK constraint on templates.user_id
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_user_id_fkey;
