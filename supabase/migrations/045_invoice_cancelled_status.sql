-- Migration: Add 'annulee' (cancelled) status to invoices
-- This allows invoices to be cancelled without affecting financial calculations

-- Drop the existing constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add the new constraint with 'annulee' status
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('brouillon', 'envoyee', 'payee', 'annulee'));

-- Add index for cancelled status filtering if not exists
CREATE INDEX IF NOT EXISTS idx_invoices_status_cancelled ON invoices(status) WHERE status = 'annulee';
