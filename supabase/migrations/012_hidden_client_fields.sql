-- Migration 012: Replace template_show_client_fields with template_hidden_client_fields
-- Changes from boolean (show all or none) to JSONB array (hide specific fields by key)

-- Drop the old boolean column
ALTER TABLE companies
DROP COLUMN IF EXISTS template_show_client_fields;

-- Add new JSONB column for storing array of hidden field keys
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS template_hidden_client_fields JSONB DEFAULT '[]'::jsonb;
