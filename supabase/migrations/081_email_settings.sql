-- ============================================================================
-- Migration 081: Email Settings
-- Add email sender name and reply-to settings to companies
-- ============================================================================

-- Add column for custom sender name (displayed in "From" field)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS email_sender_name TEXT;

-- Add column for reply-to email address
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS email_reply_to TEXT;

-- Comment for documentation
COMMENT ON COLUMN companies.email_sender_name IS 'Custom display name for email sender (e.g., "John Doe" instead of company name)';
COMMENT ON COLUMN companies.email_reply_to IS 'Email address where replies should be sent (defaults to company email)';
