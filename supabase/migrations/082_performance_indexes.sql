-- ============================================================================
-- Migration: Performance Indexes
-- Description: Add indexes to improve query performance
-- ============================================================================

-- Reviews: frequently queried by mission_id
CREATE INDEX IF NOT EXISTS idx_reviews_mission_id ON reviews(mission_id);

-- Reviews: filter by is_published
CREATE INDEX IF NOT EXISTS idx_reviews_mission_published ON reviews(mission_id, is_published);

-- Verifolio review selections: queried by profile_id
CREATE INDEX IF NOT EXISTS idx_verifolio_review_selections_profile_id ON verifolio_review_selections(profile_id);

-- Verifolio activity medias: queried by activity_id
CREATE INDEX IF NOT EXISTS idx_verifolio_activity_medias_activity_id ON verifolio_activity_medias(activity_id);

-- Custom field values: composite index for entity lookups
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);

-- Custom field values: user + entity composite for faster filtered lookups
CREATE INDEX IF NOT EXISTS idx_custom_field_values_user_entity ON custom_field_values(user_id, entity_type, entity_id);

-- Missions: frequently filtered by user and verifolio visibility
CREATE INDEX IF NOT EXISTS idx_missions_user_verifolio ON missions(user_id, visible_on_verifolio) WHERE visible_on_verifolio = true;

-- Review mission media: queried by mission_id and is_public
CREATE INDEX IF NOT EXISTS idx_review_mission_media_mission_public ON review_mission_media(mission_id, is_public);

-- Clients: frequently ordered by nom and filtered by deleted_at
CREATE INDEX IF NOT EXISTS idx_clients_user_active ON clients(user_id, nom) WHERE deleted_at IS NULL;

-- Deals: frequently filtered by user and status
CREATE INDEX IF NOT EXISTS idx_deals_user_status ON deals(user_id, status);

-- Quotes: frequently filtered by user and status
CREATE INDEX IF NOT EXISTS idx_quotes_user_status ON quotes(user_id, status);

-- Invoices: frequently filtered by user and status
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
