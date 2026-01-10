-- ============================================================================
-- Migration 058: Add birthday to contacts and notes to clients
-- ============================================================================

-- Add birthday column to contacts table
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS birthday DATE;

COMMENT ON COLUMN contacts.birthday IS 'Contact birthday date';

-- Add notes column to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN clients.notes IS 'Free-form notes about the client';
