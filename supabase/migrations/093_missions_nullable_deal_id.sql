-- Migration: Make deal_id nullable in missions table
-- Reason: A mission can be created independently of a deal

ALTER TABLE missions
  ALTER COLUMN deal_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN missions.deal_id IS 'Optional reference to a deal. A mission can exist without a deal.';
