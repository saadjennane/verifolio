-- ============================================================================
-- Migration 084: Add supplier scope to custom_field_scope enum
-- ============================================================================
-- Allows custom fields to be applied to suppliers

-- Add 'supplier' value to the custom_field_scope enum
ALTER TYPE custom_field_scope ADD VALUE IF NOT EXISTS 'supplier';
