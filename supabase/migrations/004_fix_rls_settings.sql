-- Migration: 004_fix_rls_settings.sql
-- Description: Configure RLS policies for settings tables (companies, custom_fields, custom_field_values)
-- Date: 2025-12-23

-- ============================================================================
-- COMPANIES - RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "companies_all" ON companies;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

-- Users can only see their own company
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own company
CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own company
CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own company
CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- CUSTOM_FIELDS - RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "custom_fields_all" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_select" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_insert" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_update" ON custom_fields;
DROP POLICY IF EXISTS "custom_fields_delete" ON custom_fields;

-- Users can only see their own custom fields
CREATE POLICY "custom_fields_select" ON custom_fields
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own custom fields
CREATE POLICY "custom_fields_insert" ON custom_fields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom fields
CREATE POLICY "custom_fields_update" ON custom_fields
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own custom fields
CREATE POLICY "custom_fields_delete" ON custom_fields
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- CUSTOM_FIELD_VALUES - RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "custom_field_values_all" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_select" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_insert" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_update" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_delete" ON custom_field_values;

-- Users can only see their own custom field values
CREATE POLICY "custom_field_values_select" ON custom_field_values
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own custom field values
CREATE POLICY "custom_field_values_insert" ON custom_field_values
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom field values
CREATE POLICY "custom_field_values_update" ON custom_field_values
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own custom field values
CREATE POLICY "custom_field_values_delete" ON custom_field_values
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TEMPLATES - RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "templates_all" ON templates;
DROP POLICY IF EXISTS "templates_select" ON templates;
DROP POLICY IF EXISTS "templates_insert" ON templates;
DROP POLICY IF EXISTS "templates_update" ON templates;
DROP POLICY IF EXISTS "templates_delete" ON templates;

-- Users can only see their own templates
CREATE POLICY "templates_select" ON templates
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own templates
CREATE POLICY "templates_insert" ON templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "templates_update" ON templates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "templates_delete" ON templates
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TEMPLATE_BLOCKS - RLS Policies (via template ownership)
-- ============================================================================

-- Enable RLS
ALTER TABLE template_blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "template_blocks_all" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_select" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_insert" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_update" ON template_blocks;
DROP POLICY IF EXISTS "template_blocks_delete" ON template_blocks;

-- Users can see blocks of their own templates
CREATE POLICY "template_blocks_select" ON template_blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM templates WHERE templates.id = template_blocks.template_id AND templates.user_id = auth.uid())
  );

-- Users can create blocks for their own templates
CREATE POLICY "template_blocks_insert" ON template_blocks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM templates WHERE templates.id = template_blocks.template_id AND templates.user_id = auth.uid())
  );

-- Users can update blocks of their own templates
CREATE POLICY "template_blocks_update" ON template_blocks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM templates WHERE templates.id = template_blocks.template_id AND templates.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM templates WHERE templates.id = template_blocks.template_id AND templates.user_id = auth.uid())
  );

-- Users can delete blocks of their own templates
CREATE POLICY "template_blocks_delete" ON template_blocks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM templates WHERE templates.id = template_blocks.template_id AND templates.user_id = auth.uid())
  );

-- ============================================================================
-- STORAGE BUCKET FOR LOGOS
-- ============================================================================

-- Note: Storage bucket creation and policies should be done via Supabase Dashboard
-- or via the Supabase CLI storage configuration.
-- The bucket 'company-assets' needs to be created with:
-- - Public access for reading (or use signed URLs)
-- - Insert/Update/Delete restricted to authenticated users for their own files

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "companies_select" ON companies IS 'Users can only view their own company settings';
COMMENT ON POLICY "custom_fields_select" ON custom_fields IS 'Users can only view their own custom fields';
COMMENT ON POLICY "custom_field_values_select" ON custom_field_values IS 'Users can only view values for their own custom fields';
COMMENT ON POLICY "templates_select" ON templates IS 'Users can only view their own document templates';
COMMENT ON POLICY "template_blocks_select" ON template_blocks IS 'Users can only view blocks belonging to their own templates';
