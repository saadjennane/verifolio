-- Migration 011: Add client block template options
-- Adds columns for customizing the client block in document templates

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS template_client_block_style TEXT DEFAULT 'bordered' CHECK (template_client_block_style IN ('minimal', 'bordered', 'filled')),
ADD COLUMN IF NOT EXISTS template_show_client_address BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_client_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_client_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_client_fields BOOLEAN DEFAULT true;
