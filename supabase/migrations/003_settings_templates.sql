-- Migration: Settings + Templates
-- Description: Adds companies, custom fields, clients, and document templates
-- Date: 2025-12-23

-- ============================================================================
-- ENUMS (create if not exists using DO block)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE custom_field_scope AS ENUM ('company', 'client', 'document');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE custom_field_type AS ENUM ('text');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('company', 'client', 'quote', 'invoice');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('particulier', 'entreprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM ('quote', 'invoice');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE template_zone AS ENUM ('header', 'doc_info', 'client', 'items', 'totals', 'footer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE template_block_type AS ENUM (
    'company_logo',
    'company_contact',
    'company_field',
    'client_contact',
    'client_field',
    'document_field',
    'legal_text',
    'notes',
    'items_table',
    'totals_table'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- COMPANIES (1 per user) - Add missing columns if table exists
-- ============================================================================

DO $$
BEGIN
  -- Check if companies table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    CREATE TABLE companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      display_name TEXT NOT NULL,
      logo_url TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      default_currency TEXT NOT NULL DEFAULT 'EUR',
      default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
      invoice_number_pattern TEXT NOT NULL DEFAULT 'FAC-{0000}',
      quote_number_pattern TEXT NOT NULL DEFAULT 'DEV-{0000}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT companies_user_unique UNIQUE (user_id)
    );
  ELSE
    -- Add missing columns to existing table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'display_name') THEN
      ALTER TABLE companies ADD COLUMN display_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_url') THEN
      ALTER TABLE companies ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
      ALTER TABLE companies ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email') THEN
      ALTER TABLE companies ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
      ALTER TABLE companies ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'default_currency') THEN
      ALTER TABLE companies ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'EUR';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'default_tax_rate') THEN
      ALTER TABLE companies ADD COLUMN default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'invoice_number_pattern') THEN
      ALTER TABLE companies ADD COLUMN invoice_number_pattern TEXT NOT NULL DEFAULT 'FAC-{0000}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'quote_number_pattern') THEN
      ALTER TABLE companies ADD COLUMN quote_number_pattern TEXT NOT NULL DEFAULT 'DEV-{0000}';
    END IF;
  END IF;
END $$;

-- Index (idempotent)
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- ============================================================================
-- CUSTOM FIELDS (user-defined fields for company, client, or document)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scope custom_field_scope NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type custom_field_type NOT NULL DEFAULT 'text',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_fields_user_scope_key_unique UNIQUE (user_id, scope, key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON custom_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_scope ON custom_fields(user_id, scope);

-- ============================================================================
-- CUSTOM FIELD VALUES (actual values stored per entity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  value_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_field_values_unique UNIQUE (field_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(field_id);

-- ============================================================================
-- CLIENTS - Add missing columns to existing table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'type') THEN
    ALTER TABLE clients ADD COLUMN type client_type NOT NULL DEFAULT 'particulier';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'country') THEN
    ALTER TABLE clients ADD COLUMN country TEXT DEFAULT 'FR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'phone') THEN
    ALTER TABLE clients ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address') THEN
    ALTER TABLE clients ADD COLUMN address TEXT;
  END IF;
END $$;

-- ============================================================================
-- TEMPLATES (document layout templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  doc_type doc_type NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_doc_type ON templates(user_id, doc_type);

-- Partial unique index: only one default template per (user_id, doc_type)
-- Drop first if exists, then recreate
DROP INDEX IF EXISTS idx_templates_default_unique;
CREATE UNIQUE INDEX idx_templates_default_unique ON templates(user_id, doc_type) WHERE is_default = TRUE;

-- ============================================================================
-- TEMPLATE BLOCKS (individual blocks within a template)
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  zone template_zone NOT NULL,
  block_type template_block_type NOT NULL,
  field_id UUID REFERENCES custom_fields(id) ON DELETE SET NULL,
  label_override TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT template_blocks_field_required CHECK (
    (block_type NOT IN ('company_field', 'client_field', 'document_field'))
    OR (field_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_template_blocks_template ON template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_blocks_zone ON template_blocks(template_id, zone);
CREATE INDEX IF NOT EXISTS idx_template_blocks_sort ON template_blocks(template_id, zone, sort_order);

-- ============================================================================
-- TRIGGERS for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if exist, then recreate
DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS custom_fields_updated_at ON custom_fields;
CREATE TRIGGER custom_fields_updated_at
  BEFORE UPDATE ON custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS custom_field_values_updated_at ON custom_field_values;
CREATE TRIGGER custom_field_values_updated_at
  BEFORE UPDATE ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS templates_updated_at ON templates;
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS template_blocks_updated_at ON template_blocks;
CREATE TRIGGER template_blocks_updated_at
  BEFORE UPDATE ON template_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES (permissive for dev)
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "companies_all" ON companies;
DROP POLICY IF EXISTS "custom_fields_all" ON custom_fields;
DROP POLICY IF EXISTS "custom_field_values_all" ON custom_field_values;
DROP POLICY IF EXISTS "templates_all" ON templates;
DROP POLICY IF EXISTS "template_blocks_all" ON template_blocks;

-- Create permissive policies
CREATE POLICY "companies_all" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "custom_fields_all" ON custom_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "custom_field_values_all" ON custom_field_values FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "templates_all" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "template_blocks_all" ON template_blocks FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE companies IS 'Company settings and branding info (1 per user)';
COMMENT ON TABLE custom_fields IS 'User-defined custom fields for company, client, or document';
COMMENT ON TABLE custom_field_values IS 'Values for custom fields, linked to specific entities';
COMMENT ON TABLE templates IS 'Document layout templates for quotes and invoices';
COMMENT ON TABLE template_blocks IS 'Individual blocks within a template, defining layout and content';
