-- ============================================================================
-- Migration 057: Add date format setting to companies
-- Allows users to choose between dd/mm/yyyy and mm/dd/yyyy formats
-- ============================================================================

-- Add date_format column to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'dd/mm/yyyy';

-- Add comment
COMMENT ON COLUMN companies.date_format IS 'Date format preference: dd/mm/yyyy or mm/dd/yyyy';
